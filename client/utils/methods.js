'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbOrders } from '../../db/dbOrders';
import { dbResourceLock } from '../../db/dbResourceLock';
import { dbProductLike } from '../../db/dbProductLike';
import { addTask, resolveTask } from '../layout/loading';
import { handleError } from './handleError';
import { AlertDialog } from '../layout/alertDialog';

Meteor.subscribe('isChangingSeason');

Meteor.nativeCall = Meteor.call;
Meteor.call = (function(_super) {
  function call(...args) {
    if (dbResourceLock.find('season').count()) {
      AlertDialog.alert('伺服器正忙於商業季度的切換，請稍等一下吧！[503]');

      return false;
    }
    if (! Meteor.status().connected) {
      AlertDialog.alert('糟了，伺服器好像掛了！等一下再試試吧！[503]');

      return false;
    }
    addTask();
    const lastArg = _.last(args);
    if (typeof lastArg === 'function') {
      args[args.length - 1] = function(error, result) {
        if (error) {
          handleError(error);
        }
        resolveTask();
        lastArg(error, result);
      };
    }
    else {
      args.push(function(error) {
        if (error) {
          handleError(error);
        }
        resolveTask();
      });
    }

    _super(...args);
  }

  return call;
}(Meteor.call));

export function createBuyOrder(user, companyData) {
  const companyId = companyData._id;
  const existsSellOrder = dbOrders.findOne({
    companyId: companyId,
    userId: user._id,
    orderType: '賣出'
  });
  if (existsSellOrder) {
    AlertDialog.alert('您有賣出該公司股票的訂單正在執行中，無法同時下達購買的訂單！');

    return false;
  }
  const userMoney = user.profile.money;
  const minimumUnitPrice = Math.max(Math.ceil(companyData.listPrice / 2), 1);
  const maximumUnitPrice = Math.min(userMoney, companyData.listPrice * 2);
  if (minimumUnitPrice > maximumUnitPrice) {
    AlertDialog.alert('您的金錢不足以購買此公司的股票！');

    return false;
  }

  AlertDialog.promptWithTitle('股份購入', `請輸入您期望購入的每股單價：(${minimumUnitPrice}~${maximumUnitPrice})`, function(result) {
    const unitPrice = parseInt(result, 10);
    if (! unitPrice) {
      return false;
    }
    if (unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
      AlertDialog.alert('不正確的價格設定！');

      return false;
    }
    const maximumAmount = Math.floor(userMoney / unitPrice);
    if (maximumAmount < 1) {
      AlertDialog.alert('您的金錢不足以購買此公司的股票！');

      return false;
    }
    AlertDialog.promptWithTitle('股份購入', `請輸入總購入數量：(1~${maximumAmount})`, function(result) {
      const amount = parseInt(result, 10);
      if (! amount) {
        return false;
      }
      if (amount < 1 || amount > maximumAmount) {
        AlertDialog.alert('不正確的數量設定！');

        return false;
      }
      Meteor.call('createBuyOrder', {companyId, unitPrice, amount});
    });
  });
}

export function createSellOrder(user, companyData) {
  const userId = user._id;
  const companyId = companyData._id;
  const existsBuyOrder = dbOrders.findOne({
    companyId: companyId,
    userId: userId,
    orderType: '購入'
  });
  if (existsBuyOrder) {
    AlertDialog.alert('您有買入該公司股票的訂單正在執行中，無法同時下達賣出的訂單！');

    return false;
  }
  const minimumUnitPrice = Math.max(Math.ceil(companyData.listPrice / 2), 1);
  const maximumUnitPrice = companyData.listPrice * 2;
  AlertDialog.promptWithTitle('股份賣出', `請輸入您期望賣出的每股單價：(${minimumUnitPrice}~${maximumUnitPrice})`, function(result) {
    const unitPrice = parseInt(result, 10);
    if (! unitPrice) {
      return false;
    }
    if (unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
      AlertDialog.alert('不正確的價格設定！');

      return false;
    }
    const directorData = dbDirectors.findOne({userId, companyId});
    const maximumAmount = directorData.stocks;
    AlertDialog.promptWithTitle('股份賣出', `請輸入總賣出數量：(1~${maximumAmount})`, function(result) {
      const amount = parseInt(result, 10);
      if (! amount) {
        return false;
      }
      if (amount < 1 || amount > maximumAmount) {
        AlertDialog.alert('不正確的數量設定！');

        return false;
      }
      Meteor.call('createSellOrder', {companyId, unitPrice, amount});
    });
  });
}

export function retrieveOrder(orderData) {
  const companyData = dbCompanies.findOne(orderData.companyId);
  if (companyData) {
    const message = '' +
      '確定要取消「以$' + orderData.unitPrice +
      '單價' + orderData.orderType + '數量' + orderData.amount + '的「' +
      companyData.companyName + '」公司股份」這筆訂單嗎？（將付出手續費$1）';
    AlertDialog.confirm(message, function(result) {
      result && Meteor.call('retrieveOrder', orderData._id);
    });
  }
}

export function changeChairmanTitle(companyData) {
  AlertDialog.prompt('要修改董事長的頭銜嗎？', function(chairmanTitle) {
    if (chairmanTitle && chairmanTitle.length > 0 && chairmanTitle.length <= 20) {
      Meteor.call('changeChairmanTitle', companyData._id, chairmanTitle);
    }
    else if (chairmanTitle) {
      AlertDialog.alert('無效的頭銜名稱！');
    }
  }, companyData.chairmanTitle);
}

export function voteProduct(productId) {
  const user = Meteor.user();
  if (! user) {
    AlertDialog.alert('您尚未登入，無法向產品投推薦票！');

    return false;
  }
  if (user.profile.vote < 1) {
    AlertDialog.alert('您的推薦票數量不足，無法繼續推薦產品！');

    return false;
  }
  AlertDialog.confirm('您的推薦票剩餘' + user.profile.vote + '張，確定要向產品投出推薦票嗎？', function(result) {
    result && Meteor.call('voteProduct', productId);
  });
}

export function likeProduct(productId, companyId) {
  const user = Meteor.user();
  if (! user) {
    AlertDialog.alert('您尚未登入，無法向產品進行董事推薦！');

    return false;
  }
  const companyData = dbCompanies.findOne(companyId);
  const userId = user._id;
  if (dbDirectors.find({companyId, userId}).count() < 1) {
    AlertDialog.alert('您至少需要擁有一張「' + companyData.companyName + '」的股票才可對公司產品進行董事推薦！');

    return false;
  }
  if (dbProductLike.find({productId, userId}).count() > 0) {
    AlertDialog.confirm('您已經對此產品做出過正面評價，要收回評價嗎？', function(result) {
      result && Meteor.call('likeProduct', productId);
    });
  }
  else {
    Meteor.call('likeProduct', productId);
  }
}
