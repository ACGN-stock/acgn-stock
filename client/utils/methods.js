'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { dbOrders } from '../../db/dbOrders';
import { dbDirectors } from '../../db/dbDirectors';
import { addTask, resolveTask } from '../layout/loading';
import { handleError } from './handleError';

Meteor.call = (function(_super) {
  function call(...args) {
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
  const companyName = companyData.companyName;
  const existsSellOrder = dbOrders.findOne({
    companyName: companyName,
    username: user.username,
    orderType: '賣出'
  });
  if (existsSellOrder) {
    window.alert('您有賣出該公司股票的訂單正在執行中，無法同時下達購買的訂單！');

    return false;
  }
  const userMoney = user.profile.money;
  const minimumUnitPrice = Math.max(Math.ceil(companyData.lastPrice / 2), 1);
  const maximumUnitPrice = Math.min(userMoney, companyData.lastPrice * 2);
  if (minimumUnitPrice > maximumUnitPrice) {
    window.alert('您的金錢不足以購買此公司的股票！');

    return false;
  }
  const unitPrice = parseInt(window.prompt(`請輸入您期望購入的每股單價：(${minimumUnitPrice}~${maximumUnitPrice})`), 10);
  if (! unitPrice || unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
    window.alert('不正確的價格設定！');

    return false;
  }
  const maximumAmount = Math.floor(userMoney / unitPrice);
  if (maximumAmount < 1) {
    window.alert('您的金錢不足以購買此公司的股票！');

    return false;
  }
  const amount = parseInt(window.prompt(`請輸入總購入數量：(1~${maximumAmount})`), 10);
  if (! amount || amount < 1 || amount > maximumAmount) {
    window.alert('不正確的數量設定！');

    return false;
  }
  Meteor.call('createBuyOrder', {companyName, unitPrice, amount});
}

export function createSellOrder(user, companyData) {
  const companyName = companyData.companyName;
  const existsBuyOrder = dbOrders.findOne({
    companyName: companyName,
    username: user.username,
    orderType: '購入'
  });
  if (existsBuyOrder) {
    window.alert('您有買入該公司股票的訂單正在執行中，無法同時下達賣出的訂單！');

    return false;
  }
  const minimumUnitPrice = Math.max(Math.ceil(companyData.lastPrice / 2), 1);
  const maximumUnitPrice = companyData.lastPrice * 2;
  const unitPrice = parseInt(window.prompt(`請輸入您期望賣出的每股單價：(${minimumUnitPrice}~${maximumUnitPrice})`), 10);
  if (! unitPrice || unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
    window.alert('不正確的價格設定！');

    return false;
  }
  const username = user && user.username;
  const directorData = dbDirectors.findOne({username, companyName});
  const maximumAmount = directorData.stocks;
  const amount = parseInt(window.prompt(`請輸入總賣出數量：(1~${maximumAmount})`), 10);
  if (! amount || amount < 1 || amount > maximumAmount) {
    window.alert('不正確的數量設定！');

    return false;
  }
  Meteor.call('createSellOrder', {companyName, unitPrice, amount});
}

export function retrieveOrder(orderData) {
  const message = '' +
    '確定要取消「以$' + orderData.unitPrice +
    '單價' + orderData.orderType + '數量' + orderData.amount + '的「' +
    orderData.companyName + '」公司股份」這筆訂單嗎？（將付出手續費$1）';
  if (window.confirm(message)) {
    Meteor.call('retrieveOrder', orderData._id);
  }
}
