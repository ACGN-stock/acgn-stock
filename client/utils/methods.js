'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
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
  const userMoney = user.profile.money;
  const minimumUnitPrice = Math.max(Math.ceil(companyData.lastPrice / 2), 1);
  const maximumUnitPrice = userMoney;
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
  const companyName = companyData.companyName;
  Meteor.call('createBuyOrder', {companyName, unitPrice, amount});
}

export function createSellOrder(user, companyData) {
  const minimumUnitPrice = Math.max(Math.ceil(companyData.lastPrice / 2), 1);
  const maximumUnitPrice = companyData.lastPrice * 2;
  const unitPrice = parseInt(window.prompt(`請輸入您期望賣出的每股單價：(${minimumUnitPrice}~${maximumUnitPrice})`), 10);
  if (! unitPrice || unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
    window.alert('不正確的價格設定！');

    return false;
  }
  const companyName = companyData.companyName;
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
