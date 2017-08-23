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
        _id: 1
      }
    })
    .observeChanges({
      added: (id) => {
        this.subscribe('queryChairmanAsVariable', id);
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

Template.companySummary.onCreated(function() {
  this.rPicture = new ReactiveVar('');
  $.ajax({
    url: '/companyPicture',
    data: {
      id: this.data._id,
      type: 'small'
    },
    success: (response) => {
      this.rPicture.set(response);
    }
  });
});
Template.companySummary.helpers({
  getPicture() {
    const templateInstance = Template.instance();

    return templateInstance.rPicture.get();
  },
  displayTagList(tagList) {
    return tagList.join('、');
  },
  priceDisplayClass(lastPrice, listPrice) {
    if (lastPrice > listPrice) {
      return 'text-danger';
    }
    else if (listPrice > lastPrice) {
      return 'text-success';
    }
  },
  getManageHref(companyId) {
    return FlowRouter.path('manageCompany', {companyId});
  },
  getStockAmount(companyId) {
    const userId = Meteor.user()._id;
    const ownStockData = dbDirectors.findOne({companyId, userId});

    return ownStockData ? ownStockData.stocks : 0;
  },
  getStockPercentage(companyId, totalRelease) {
    const userId = Meteor.user()._id;
    const ownStockData = dbDirectors.findOne({companyId, userId});

    if (ownStockData) {
      return Math.round(ownStockData.stocks / totalRelease * 10000) / 100;
    }

    return 0;
  },
  ownOrderList(companyId) {
    const userId = Meteor.user()._id;

    return dbOrders.find({companyId, userId});
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
