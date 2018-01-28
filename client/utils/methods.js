'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { dbCompanies } from '/db/dbCompanies';
import { dbFoundations } from '/db/dbFoundations';
import { dbDirectors } from '/db/dbDirectors';
import { dbOrders } from '/db/dbOrders';
import { dbProducts } from '/db/dbProducts';
import { dbResourceLock } from '/db/dbResourceLock';
import { dbVariables } from '/db/dbVariables';
import { dbVoteRecord } from '/db/dbVoteRecord';
import { addTask, resolveTask } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { handleError } from './handleError';
import { currencyFormat } from './helpers';

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
  if (user.profile.isInVacation) {
    alertDialog.alert('您現在正在渡假中，請好好放鬆！');

    return false;
  }

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
    message: `請輸入您期望購入的每股單價：(${currencyFormat(minimumUnitPrice)}~${currencyFormat(maximumUnitPrice)})`,
    inputType: 'number',
    customSetting: `min="${minimumUnitPrice}" max="${maximumUnitPrice}"`,
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
        inputType: 'number',
        customSetting: `min="1" max="${maximumAmount}"`,
        callback: function(result) {
          const amount = parseInt(result, 10);
          if (! amount) {
            return false;
          }
          if (amount < 1 || amount > maximumAmount) {
            alertDialog.alert('不正確的數量設定！');

            return false;
          }
          Meteor.customCall('createBuyOrder', { companyId, unitPrice, amount });
        }
      });
    }
  });
}

export function createSellOrder(user, companyData) {
  if (user.profile.isInVacation) {
    alertDialog.alert('您現在正在渡假中，請好好放鬆！');

    return false;
  }

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
    message: `請輸入您期望賣出的每股單價：(${currencyFormat(minimumUnitPrice)}~${currencyFormat(maximumUnitPrice)})`,
    inputType: 'number',
    customSetting: `min="${minimumUnitPrice}" max="${maximumUnitPrice}"`,
    callback: function(result) {
      const unitPrice = parseInt(result, 10);
      if (! unitPrice) {
        return false;
      }
      if (unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
        alertDialog.alert('不正確的價格設定！');

        return false;
      }
      const directorData = dbDirectors.findOne({ userId, companyId });
      const maximumAmount = directorData.stocks;
      alertDialog.dialog({
        type: 'prompt',
        title: '股份賣出',
        message: `請輸入總賣出數量：(1~${maximumAmount})`,
        inputType: 'number',
        customSetting: `min="1" max="${maximumAmount}"`,
        callback: function(result) {
          const amount = parseInt(result, 10);
          if (! amount) {
            return false;
          }
          if (amount < 1 || amount > maximumAmount) {
            alertDialog.alert('不正確的數量設定！');

            return false;
          }
          Meteor.customCall('createSellOrder', { companyId, unitPrice, amount });
        }
      });
    }
  });
}

export function retrieveOrder(orderData) {
  const companyData = dbCompanies.findOne(orderData.companyId);
  if (companyData) {
    const message = '' +
      '確定要取消「以$' + orderData.unitPrice + orderData.orderType + orderData.amount + '股的「' +
      companyData.companyName + '」公司股份」這筆訂單嗎？（將付出手續費$1）';
    alertDialog.confirm({
      message,
      callback: (result) => {
        if (result) {
          Meteor.customCall('retrieveOrder', orderData._id);
        }
      }
    });
  }
}

export function changeChairmanTitle(companyData) {
  const user = Meteor.user();

  if (! user) {
    alertDialog.alert('您尚未登入，無法修改董事長頭銜！');

    return false;
  }

  if (user.profile.isInVacation) {
    alertDialog.alert('您現在正在渡假中，請好好放鬆！');

    return false;
  }

  alertDialog.prompt({
    message: '要修改董事長的頭銜嗎？',
    defaultValue: companyData.chairmanTitle,
    customSetting: `minlength="1" maxlength="20"`,
    callback: (chairmanTitle) => {
      if (chairmanTitle && chairmanTitle.length > 0 && chairmanTitle.length <= 20) {
        Meteor.customCall('changeChairmanTitle', companyData._id, chairmanTitle);
      }
      else if (chairmanTitle) {
        alertDialog.alert('無效的頭銜名稱！');
      }
    }
  });
}

export function voteProduct(productId) {
  const user = Meteor.user();
  if (! user) {
    alertDialog.alert('您尚未登入，無法向產品投推薦票！');

    return false;
  }

  if (user.profile.isInVacation) {
    alertDialog.alert('您現在正在渡假中，請好好放鬆！');

    return false;
  }

  if (user.profile.voteTickets < 1) {
    alertDialog.alert('您的推薦票數量不足，無法繼續推薦產品！');

    return false;
  }
  const userId = user._id;

  const { companyId } = dbProducts.findOne(productId);

  if (dbVoteRecord.find({ companyId, userId }).count() > 0) {
    alertDialog.alert('您已在本季度對該公司的產品投過推薦票，無法繼續對同一家公司的產品投推薦票！');

    return false;
  }
  alertDialog.confirm({
    message: `您的推薦票剩餘${user.profile.voteTickets}張，確定要向產品投出推薦票嗎？`,
    callback: (result) => {
      if (result) {
        Meteor.customCall('voteProduct', productId);
      }
    }
  });
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

export function investFoundCompany(companyId) {
  const foundationData = dbFoundations.findOne(companyId);
  const user = Meteor.user();
  if (! user) {
    alertDialog.alert('您尚未登入！');

    return false;
  }
  const userId = user._id;
  const minimumInvest = Math.ceil(Meteor.settings.public.minReleaseStock / Meteor.settings.public.foundationNeedUsers);
  const alreadyInvest = _.findWhere(foundationData.invest, { userId });
  const alreadyInvestAmount = alreadyInvest ? alreadyInvest.amount : 0;
  const maximumInvest = Math.min(Meteor.user().profile.money, Meteor.settings.public.maximumInvest - alreadyInvestAmount);
  if (minimumInvest > maximumInvest) {
    alertDialog.alert('您的投資已達上限或剩餘金錢不足以進行投資！');

    return false;
  }

  alertDialog.dialog({
    type: 'prompt',
    title: '投資',
    message: `
      要投資多少金額？(${currencyFormat(minimumInvest)}~${currencyFormat(maximumInvest)})
      <div class="text-danger">
        投資理財有賺有賠，請先確認您要投資的公司是否符合
        <a href="${dbVariables.get('fscRuleURL')}" target="_blank">金管會的規定</a>。
      </div>
    `,
    defaultValue: null,
    callback: function(result) {
      const amount = parseInt(result, 10);
      if (! amount) {
        return false;
      }
      if (amount >= minimumInvest && amount <= maximumInvest) {
        Meteor.customCall('investFoundCompany', companyId, amount);
      }
      else {
        alertDialog.alert('不正確的金額數字！');
      }
    }
  });
}
