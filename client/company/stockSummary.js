'use strict';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbOrders } from '../../db/dbOrders';
import { addTask, resolveTask } from '../layout/loading';

export const rKeyword = new ReactiveVar('');
export const rIsOnlyShowMine = new ReactiveVar(false);
export const rSortBy = new ReactiveVar('lastPrice');
Template.stockSummary.onCreated(function() {
  this.autorun(() => {
    this.stockOffset = 0;
    this.subscribe('stockSummary', rKeyword.get(), rIsOnlyShowMine.get(), rSortBy.get(), this.stockOffset);
  });
  this.autorun(() => {
    dbCompanies.find().forEach((companyData) => {
      this.subscribe('queryChairman', companyData.companyName);
      this.subscribe('queryOwnStocks', companyData.companyName);
    });
  });
  this.subscribe('queryMyOrder');
});
Template.stockSummary.helpers({
  companyList() {
    return dbCompanies.find({}, {
      sort: {
        [rSortBy.get()]: -1
      }
    });
  }
});
Template.stockSummary.events({
  'click [data-action="more"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.stockOffset += 10;
    addTask();
    templateInstance.subscribe('stockSummary', rKeyword.get(), rIsOnlyShowMine.get(), rSortBy.get(), templateInstance.stockOffset, resolveTask);
  }
});

Template.stockFilterForm.onRendered(function() {
  this.$keyword = this.$('[name="keyword"]');
});
Template.stockFilterForm.helpers({
  isOnlyShowMineBtnClass() {
    if (rIsOnlyShowMine.get()) {
      return 'btn btn-secondary active mr-1';
    }
    else {
      return 'btn btn-secondary mr-1';
    }
  },
  sortByBtnClass(sortByField) {
    if (sortByField === rSortBy.get()) {
      return 'btn btn-secondary active';
    }
    else {
      return 'btn btn-secondary';
    }
  },
  keyword() {
    return rKeyword.get();
  }
});
Template.stockFilterForm.events({
  'click [data-action="toggleIsOnlyShowMine"]'() {
    const newValue = ! rIsOnlyShowMine.get();
    rIsOnlyShowMine.set(newValue);
  },
  'click [data-action="sortBy"]'(event) {
    const newValue = $(event.currentTarget).val();
    rSortBy.set(newValue);
  },
  'submit'(event, templateInstance) {
    event.preventDefault();
    rKeyword.set(templateInstance.$keyword.val());
  }
});

Template.companySummary.helpers({
  displayTagList(tagList) {
    return tagList.join('、');
  },
  getManager(manager) {
    return manager === '!none' ? '無' : manager;
  },
  getManageHref(companyId) {
    return FlowRouter.path('manageCompany', {companyId});
  },
  isChairman(companyName) {
    const chairman = dbDirectors.findOne({companyName}, {
      sort: {
        stocks: -1
      },
      limit: 1
    });
    const user = Meteor.user();
    const username = user && username;

    return chairman && user === chairman.username;
  },
  getChainman(companyName) {
    const chairman = dbDirectors.findOne({companyName}, {
      sort: {
        stocks: -1
      },
      limit: 1
    });

    return chairman ? chairman.username : '無';
  },
  isManager(manager) {
    const user = Meteor.user();
    const username = user && username;

    return username === manager;
  },
  getStockAmount(companyName) {
    const user = Meteor.user();
    const username = user && username;
    const ownStockData = dbDirectors.findOne({username, companyName});

    return ownStockData ? ownStockData.stocks : 0;
  },
  getStockPercentage(companyName, totalRelease) {
    const user = Meteor.user();
    const username = user && username;
    const ownStockData = dbDirectors.findOne({username, companyName});

    if (ownStockData) {
      return Math.round(ownStockData.stocks / totalRelease * 10000) / 100;
    }
    else {
      return 0;
    }
  },
  haveStock(companyName) {
    const user = Meteor.user();
    const username = user && username;
    const ownStockData = dbDirectors.findOne({username, companyName});

    return ownStockData;
  },
  haveOrderList(companyName) {
    const user = Meteor.user();
    const username = user && user.username;

    return dbOrders.find({username, companyName});
  }
});
Template.companySummary.events({
  'click [data-action="changeChairmanTitle"]'(event, templateInstance) {
    const companyData = templateInstance.data;
    const chairmanTitle = window.prompt('要修改董事長的頭銜嗎？', companyData.chairmanTitle);
    if (chairmanTitle && chairmanTitle.length <= 20) {
      Meteor.call('changeChairmanTitle', companyData.companyName, chairmanTitle);
    }
    else {
      window.alert('無效的頭銜名稱！');
    }
  },
  'click [data-action="createBuyOrder"]'(event, templateInstance) {
    event.preventDefault();
    const userMoney = Meteor.user().profile.money;
    const maximumUnitPrice = userMoney;
    const unitPrice = parseInt(window.prompt(`請輸入您期望購入的每股單價：(1~${maximumUnitPrice})`), 10);
    if (unitPrice >= 1 && unitPrice <= maximumUnitPrice) {
      const maximumAmount = Math.floor(userMoney / unitPrice);
      const amount = parseInt(window.prompt(`請輸入總購入數量：(1~${maximumAmount})`), 10);
      if (amount >= 1 && amount <= maximumAmount) {
        const companyName = templateInstance.data.companyName;
        Meteor.call('createBuyOrder', {companyName, unitPrice, amount});
      }
      else {
        window.alert('不正確的數量設定！');
      }
    }
    else {
      window.alert('不正確的單價設定！');
    }
  },
  'click [data-action="createSellOrder"]'(event, templateInstance) {
    event.preventDefault();
    const companyData = templateInstance.data;
    const maximumUnitPrice = companyData.lastPrice || 1;
    const unitPrice = parseInt(window.prompt(`請輸入您期望賣出的每股單價：(1~${maximumUnitPrice})`), 10);
    if (unitPrice >= 1 && unitPrice <= maximumUnitPrice) {
      const companyName = templateInstance.data.companyName;
      const user = Meteor.user();
      const username = user && username;
      const directorData = dbDirectors.findOne({username, companyName});
      const maximumAmount = directorData.stocks;
      const amount = parseInt(window.prompt(`請輸入總賣出數量：(1~${maximumAmount})`), 10);
      if (amount >= 1 && amount <= maximumAmount) {
        Meteor.call('createSellOrder', {companyName, unitPrice, amount});
      }
      else {
        window.alert('不正確的數量設定！');
      }
    }
    else {
      window.alert('不正確的單價設定！');
    }
  },
  'click [data-cancel-order]'(event) {
    event.preventDefault();
    const orderId = $(event.currentTarget).attr('data-cancel-order');
    const orderData = dbOrders.findOne(orderId);
    const message = '' +
      '確定要取消「以$' + orderData.lastPrice +
      '單價' + orderData.orderType + '數量' + orderData.amount + '的「' +
      orderData.companyName + '」公司股份」這筆訂單嗎？（付出手續費一元）';
    if (window.confirm(message)) {
      Meteor.call('retrieveOrder', orderId);
    }
  }
});
