'use strict';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbOrders } from '../../db/dbOrders';
import { dbResourceLock } from '../../db/dbResourceLock';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { createBuyOrder, createSellOrder, retrieveOrder, changeChairmanTitle } from '../utils/methods';

inheritedShowLoadingOnSubscribing(Template.stockSummary);
const rKeyword = new ReactiveVar('');
const rIsOnlyShowMine = new ReactiveVar(false);
const rSortBy = new ReactiveVar('lastPrice');
const rStockOffset = new ReactiveVar(0);
Template.stockSummary.onCreated(function() {
  rStockOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const keyword = rKeyword.get();
    const isOnlyShowMine = rIsOnlyShowMine.get();
    const sort = rSortBy.get();
    const offset = rStockOffset.get();
    this.subscribe('stockSummary', keyword, isOnlyShowMine, sort, offset);
  });
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    if (Meteor.user()) {
      this.subscribe('queryOwnStocks');
      this.subscribe('queryMyOrder');
    }
  });
  this.observer = dbCompanies
    .find({}, {
      fields: {
        companyName: 1
      }
    })
    .observeChanges({
      added: (id, fields) => {
        this.subscribe('queryChairmanAsVariable', fields.companyName);
      }
    });
});
Template.stockSummary.onDestroyed(function() {
  this.observer.stop();
});
Template.stockSummary.helpers({
  companyList() {
    return dbCompanies.find({}, {
      sort: {
        [rSortBy.get()]: -1
      },
      limit: rStockOffset.get() + 10
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfStockSummary',
      dataNumberPerPage: 10,
      offset: rStockOffset
    };
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
    rStockOffset.set(0);
    rIsOnlyShowMine.set(newValue);
  },
  'click [data-action="sortBy"]'(event) {
    const newValue = $(event.currentTarget).val();
    rStockOffset.set(0);
    rSortBy.set(newValue);
  },
  'submit'(event, templateInstance) {
    event.preventDefault();
    rStockOffset.set(0);
    rKeyword.set(templateInstance.$keyword.val());
  }
});

Template.companySummary.helpers({
  displayTagList(tagList) {
    return tagList.join('、');
  },
  priceDisplayClass(lastPrice, listPrice) {
    if (lastPrice > listPrice) {
      return 'col content text-right text-danger';
    }
    else if (listPrice > lastPrice) {
      return 'col content text-right text-success';
    }
    else {
      return 'col content text-right';
    }
  },
  isManager(manager) {
    const user = Meteor.user();
    const username = user && user.username;

    return username === manager;
  },
  getManageHref(companyName) {
    return FlowRouter.path('manageCompany', {companyName});
  },
  getStockAmount(companyName) {
    const user = Meteor.user();
    const username = user && user.username;
    const ownStockData = dbDirectors.findOne({username, companyName});

    return ownStockData ? ownStockData.stocks : 0;
  },
  getStockPercentage(companyName, totalRelease) {
    const user = Meteor.user();
    const username = user && user.username;
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
    const username = user && user.username;
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
    changeChairmanTitle(companyData);
  },
  'click [data-action="createBuyOrder"]'(event, templateInstance) {
    event.preventDefault();
    createBuyOrder(Meteor.user(), templateInstance.data);
  },
  'click [data-action="createSellOrder"]'(event, templateInstance) {
    event.preventDefault();
    createSellOrder(Meteor.user(), templateInstance.data);
  },
  'click [data-cancel-order]'(event) {
    event.preventDefault();
    const orderId = $(event.currentTarget).attr('data-cancel-order');
    const orderData = dbOrders.findOne(orderId);
    retrieveOrder(orderData);
  }
});
