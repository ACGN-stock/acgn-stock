'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { dbOrders } from '../../db/dbOrders';
import { dbDirectors } from '../../db/dbDirectors';
import { dbProducts } from '../../db/dbProducts';
import { dbProductLike } from '../../db/dbProductLike';
import { addTask, resolveTask } from '../layout/loading';
import { handleError } from './handleError';

Meteor.call = (function(_super) {
  function call(...args) {
    if (! Meteor.status().connected) {
      window.alert('糟了，伺服器好像掛了！等一下再試試吧！[503]');

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
  const minimumUnitPrice = Math.max(Math.ceil(companyData.listPrice / 2), 1);
  const maximumUnitPrice = Math.min(userMoney, companyData.listPrice * 2);
  if (minimumUnitPrice > maximumUnitPrice) {
    window.alert('您的金錢不足以購買此公司的股票！');

    return false;
  }
  const unitPrice = parseInt(window.prompt(`請輸入您期望購入的每股單價：(${minimumUnitPrice}~${maximumUnitPrice})`), 10);
  if (! unitPrice) {
    return false;
  }
  if (unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
    window.alert('不正確的價格設定！');

    return false;
  }
  const maximumAmount = Math.floor(userMoney / unitPrice);
  if (maximumAmount < 1) {
    window.alert('您的金錢不足以購買此公司的股票！');

    return false;
  }
  const amount = parseInt(window.prompt(`請輸入總購入數量：(1~${maximumAmount})`), 10);
  if (! amount) {
    return false;
  }
  if (amount < 1 || amount > maximumAmount) {
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
  const minimumUnitPrice = Math.max(Math.ceil(companyData.listPrice / 2), 1);
  const maximumUnitPrice = companyData.listPrice * 2;
  const unitPrice = parseInt(window.prompt(`請輸入您期望賣出的每股單價：(${minimumUnitPrice}~${maximumUnitPrice})`), 10);
  if (! unitPrice) {
    return false;
  }
  if (unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
    window.alert('不正確的價格設定！');

    return false;
  }
  const username = user && user.username;
  const directorData = dbDirectors.findOne({username, companyName});
  const maximumAmount = directorData.stocks;
  const amount = parseInt(window.prompt(`請輸入總賣出數量：(1~${maximumAmount})`), 10);
  if (! amount) {
    return false;
  }
  if (amount < 1 || amount > maximumAmount) {
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

export function changeChairmanTitle(companyData) {
  const chairmanTitle = window.prompt('要修改董事長的頭銜嗎？', companyData.chairmanTitle);
  if (chairmanTitle && chairmanTitle.length <= 20) {
    Meteor.call('changeChairmanTitle', companyData.companyName, chairmanTitle);
  }
  else {
    window.alert('無效的頭銜名稱！');
  }
}

export function voteProduct(productId) {
  const user = Meteor.user();
  if (! user) {
    window.alert('您尚未登入，無法向產品投推薦票！');

    return false;
  }
  if (user.profile.vote < 1) {
    window.alert('您的推薦票數量不足，無法繼續推薦產品！');

    return false;
  }
  const productData = dbProducts.findOne(productId);
  if (window.confirm('您的推薦票剩餘' + user.profile.vote + '張，確定要向產品「' + productData.productName + '」投出推薦票嗎？')) {
    Meteor.call('voteProduct', productId);
  }
}

export function likeProduct(productId, companyName) {
  const user = Meteor.user();
  if (! user) {
    window.alert('您尚未登入，無法向產品作出股東評價！');

    return false;
  }
  const username = user.username;
  if (dbDirectors.find({companyName, username}).count() < 1) {
    window.alert('您至少需要擁有一張「' + companyName + '」的股票才可對公司產品做出股東評價！');

    return false;
  }
  if (dbProductLike.find({productId, username}).count() > 0) {
    if (window.confirm('您已經對此產品做出過正面評價，要收回評價嗎？')) {
      Meteor.call('likeProduct', productId);
    }
  }
  else {
    Meteor.call('likeProduct', productId);
  }
}
