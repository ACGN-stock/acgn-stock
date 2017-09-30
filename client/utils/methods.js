'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbOrders } from '../../db/dbOrders';
import { dbResourceLock } from '../../db/dbResourceLock';
import { dbProductLike } from '../../db/dbProductLike';
import { dbVariables } from '../../db/dbVariables';
import { dbVoteRecord } from '../../db/dbVoteRecord';
import { addTask, resolveTask } from '../layout/loading';
import { handleError } from './handleError';
import { alertDialog } from '../layout/alertDialog';

Meteor.subscribe('isChangingSeason');

function customCall(...args) {
  if (! Meteor.status().connected) {
    return false;
  }
  if (dbResourceLock.find('season').count()) {
    alertDialog.alert('伺服器正在忙碌中，請稍等一下吧！[503]');

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

  Meteor.call(...args);
}
Meteor.customCall = customCall;

export function createBuyOrder(user, companyData) {
  const companyId = companyData._id;
  const existsSellOrder = dbOrders.findOne({
    companyId: companyId,
    userId: user._id,
    orderType: '賣出'
  });
  if (existsSellOrder) {
    alertDialog.alert('您有賣出該公司股票的訂單正在執行中，無法同時下達購買的訂單！');

    return false;
  }
  const userMoney = user.profile.money;
  const minimumUnitPrice = Math.max(Math.floor(companyData.listPrice * 0.85), 1);
  let maximumUnitPrice;
  if (companyData.listPrice < dbVariables.get('lowPriceThreshold')) {
    maximumUnitPrice = Math.min(userMoney, Math.ceil(companyData.listPrice * 1.3));
  }
  else {
    maximumUnitPrice = Math.min(userMoney, Math.ceil(companyData.listPrice * 1.15));
  }
  if (minimumUnitPrice > maximumUnitPrice) {
    alertDialog.alert('您的金錢不足以購買此公司的股票！');

    return false;
  }

  alertDialog.dialog({
    type: 'prompt',
    title: '股份購入',
    message: `請輸入您期望購入的每股單價：(${minimumUnitPrice}~${maximumUnitPrice})`,
    callback: function(result) {
      const unitPrice = parseInt(result, 10);
      if (! unitPrice) {
        return false;
      }
      if (unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
        alertDialog.alert('不正確的價格設定！');

        return false;
      }
      const maximumAmount = Math.floor(userMoney / unitPrice);
      if (maximumAmount < 1) {
        alertDialog.alert('您的金錢不足以購買此公司的股票！');

        return false;
      }
      alertDialog.dialog({
        type: 'prompt',
        title: '股份購入',
        message: `請輸入總購入數量：(1~${maximumAmount})`,
        callback: function(result) {
          const amount = parseInt(result, 10);
          if (! amount) {
            return false;
          }
          if (amount < 1 || amount > maximumAmount) {
            alertDialog.alert('不正確的數量設定！');

            return false;
          }
          Meteor.customCall('createBuyOrder', {companyId, unitPrice, amount});
        }
      });
    }
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
    alertDialog.alert('您有買入該公司股票的訂單正在執行中，無法同時下達賣出的訂單！');

    return false;
  }
  const minimumUnitPrice = Math.max(Math.floor(companyData.listPrice * 0.85), 1);
  let maximumUnitPrice;
  if (companyData.listPrice < dbVariables.get('lowPriceThreshold')) {
    maximumUnitPrice = Math.ceil(companyData.listPrice * 1.3);
  }
  else {
    maximumUnitPrice = Math.ceil(companyData.listPrice * 1.15);
  }
  alertDialog.dialog({
    type: 'prompt',
    title: '股份賣出',
    message: `請輸入您期望賣出的每股單價：(${minimumUnitPrice}~${maximumUnitPrice})`,
    callback: function(result) {
      const unitPrice = parseInt(result, 10);
      if (! unitPrice) {
        return false;
      }
      if (unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
        alertDialog.alert('不正確的價格設定！');

        return false;
      }
      const directorData = dbDirectors.findOne({userId, companyId});
      const maximumAmount = directorData.stocks;
      alertDialog.dialog({
        type: 'prompt',
        title: '股份賣出',
        message: `請輸入總賣出數量：(1~${maximumAmount})`,
        callback: function(result) {
          const amount = parseInt(result, 10);
          if (! amount) {
            return false;
          }
          if (amount < 1 || amount > maximumAmount) {
            alertDialog.alert('不正確的數量設定！');

            return false;
          }
          Meteor.customCall('createSellOrder', {companyId, unitPrice, amount});
        }
      });
    }
  });
}

export function retrieveOrder(orderData) {
  const companyData = dbCompanies.findOne(orderData.companyId);
  if (companyData) {
    const message = '' +
      '確定要取消「以$' + orderData.unitPrice +
      '單價' + orderData.orderType + '數量' + orderData.amount + '的「' +
      companyData.companyName + '」公司股份」這筆訂單嗎？（將付出手續費$1）';
    alertDialog.confirm(message, function(result) {
      if (result) {
        Meteor.customCall('retrieveOrder', orderData._id);
      }
    });
  }
}

export function changeChairmanTitle(companyData) {
  alertDialog.prompt('要修改董事長的頭銜嗎？', function(chairmanTitle) {
    if (chairmanTitle && chairmanTitle.length > 0 && chairmanTitle.length <= 20) {
      Meteor.customCall('changeChairmanTitle', companyData._id, chairmanTitle);
    }
    else if (chairmanTitle) {
      alertDialog.alert('無效的頭銜名稱！');
    }
  }, companyData.chairmanTitle);
}

export function voteProduct(productId, companyId) {
  const user = Meteor.user();
  if (! user) {
    alertDialog.alert('您尚未登入，無法向產品投推薦票！');

    return false;
  }
  if (user.profile.vote < 1) {
    alertDialog.alert('您的推薦票數量不足，無法繼續推薦產品！');

    return false;
  }
  const userId = user._id;
  if (dbVoteRecord.find({companyId, userId}).count() > 0) {
    alertDialog.alert('您已在本季度對該公司的產品投過推薦票，無法繼續對同一家公司的產品投推薦票！');

    return false;
  }
  alertDialog.confirm('您的推薦票剩餘' + user.profile.vote + '張，確定要向產品投出推薦票嗎？', function(result) {
    if (result) {
      Meteor.customCall('voteProduct', productId);
    }
  });
}

export function likeProduct(productId) {
  const user = Meteor.user();
  if (! user) {
    alertDialog.alert('您尚未登入，無法對產品進行推薦！');

    return false;
  }
  const userId = user._id;
  if (dbProductLike.find({productId, userId}).count() > 0) {
    alertDialog.confirm('您已經對此產品做出過正面評價，要收回評價嗎？', function(result) {
      if (result) {
        Meteor.customCall('likeProduct', productId);
      }
    });
  }
  else {
    Meteor.customCall('likeProduct', productId);
  }
}

export function toggleFavorite(companyId) {
  const user = Meteor.user();
  if (! user) {
    alertDialog.alert('您尚未登入，無法新增我的最愛！');

    return false;
  }
  if (user.favorite.indexOf(companyId) >= 0) {
    Meteor.customCall('removeFavoriteCompany', companyId);
  }
  else {
    Meteor.customCall('addFavoriteCompany', companyId);
  }
}
