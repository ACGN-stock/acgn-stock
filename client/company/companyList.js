import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbOrders } from '/db/dbOrders';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { createBuyOrder, createSellOrder, retrieveOrder, changeChairmanTitle, toggleFavorite } from '../utils/methods';
import { isCurrentUser, isCurrentUserChairmanOf, currentUserHasRole } from '../utils/helpers';
import { rCompanyListViewMode } from '../utils/styles';

inheritedShowLoadingOnSubscribing(Template.companyList);
const rKeyword = new ReactiveVar('');
const rMatchType = new ReactiveVar('exact');
const rFilterBy = new ReactiveVar('none');
const rSortBy = new ReactiveVar('lastPrice');
export const rCompanyOffset = new ReactiveVar(0);
Template.companyList.onCreated(function() {
  this.autorun(() => {
    const page = parseInt(FlowRouter.getParam('page'), 10);

    if (! page) {
      return;
    }

    const offset = (page - 1) * 12;
    rCompanyOffset.set(offset);
  });

  this.autorunWithIdleSupport(() => {
    const keyword = rKeyword.get();
    const matchType = rMatchType.get();
    const onlyShow = rFilterBy.get();
    const sortBy = rSortBy.get();
    const offset = rCompanyOffset.get();
    this.subscribe('companyList', { keyword, matchType, onlyShow, sortBy, offset });
  });
});
Template.companyList.helpers({
  viewModeIsCard() {
    return rCompanyListViewMode.get() === 'card';
  },
  companyList() {
    return dbCompanies.find({}, {
      sort: {
        [rSortBy.get()]: -1
      },
      limit: 12
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfCompanyList',
      dataNumberPerPage: 12,
      offset: rCompanyOffset,
      useHrefRoute: true
    };
  }
});

Template.companyFilterForm.onRendered(function() {
  this.$keyword = this.$('[name="keyword"]');
  this.$matchType = this.$('[name="matchType"]');
});
Template.companyFilterForm.helpers({
  viewModeBtnClass() {
    if (rCompanyListViewMode.get() === 'card') {
      return 'fa-th';
    }

    return 'fa-th-list';
  },
  filterModeText() {
    if (! Meteor.user()) {
      return '全部顯示';
    }

    const filterBy = rFilterBy.get();
    if (filterBy === 'mine') {
      return '只顯示持有';
    }
    if (filterBy === 'favorite') {
      return '只顯示最愛';
    }
    if (filterBy === 'order') {
      return '只顯示訂單';
    }

    return '全部顯示';
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
  },
  showMatchTypeSelectedAttr(matchType) {
    return matchType === rMatchType.get() ? 'selected' : '';
  }
});
Template.companyFilterForm.events({
  'click [data-action="toggleViewMode"]'(event) {
    event.preventDefault();
    let mode = 'card';
    if (rCompanyListViewMode.get() === mode) {
      mode = 'form';
    }
    rCompanyListViewMode.set(mode);
  },
  'click [data-action="sortBy"]'(event) {
    event.preventDefault();
    const newValue = $(event.currentTarget).val();
    FlowRouter.go('companyList', {
      page: 1
    });
    rSortBy.set(newValue);
  },
  'click [data-action="filterBy"]'(event) {
    event.preventDefault();
    const newValue = $(event.currentTarget).attr('value');
    const dropdown = $(event.currentTarget)
      .parent()
      .parent();
    dropdown.toggleClass('show');
    FlowRouter.go('companyList', {
      page: 1
    });
    rFilterBy.set(newValue);
  },
  'click [data-toggle="dropdown"]'(event) {
    event.preventDefault();
    $(event.currentTarget)
      .parent()
      .toggleClass('show');
  },
  'submit'(event, templateInstance) {
    event.preventDefault();
    FlowRouter.go('companyList', {
      page: 1
    });
    rKeyword.set(templateInstance.$keyword.val());
    rMatchType.set(templateInstance.$matchType.val());
  }
});

const companyListHelpers = {
  displayTagList(tagList) {
    return tagList.join('、');
  },
  cardDisplayClass(companyData) {
    if (! Meteor.user()) {
      return 'company-card-default';
    }
    if (isCurrentUserChairmanOf(companyData._id)) {
      return 'company-card-chairman';
    }
    if (isCurrentUser(companyData.manager)) {
      return 'company-card-manager';
    }
    if (isCurrentUser(companyData.founder)) {
      return 'company-card-founder';
    }
    const amount = companyListHelpers.getCurrentUserOwnedStockAmount(companyData._id);
    if (amount > 0) {
      return 'company-card-holder';
    }

    return 'company-card-default';
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
    return FlowRouter.path('editCompany', { companyId });
  },
  getCurrentUserOwnedStockAmount(companyId) {
    const userId = Meteor.user()._id;
    const ownStockData = dbDirectors.findOne({ companyId, userId });

    return ownStockData ? ownStockData.stocks : 0;
  },
  getStockPercentage(companyId, totalRelease) {
    const userId = Meteor.user()._id;
    const ownStockData = dbDirectors.findOne({ companyId, userId });

    if (ownStockData) {
      return Math.round(ownStockData.stocks / totalRelease * 10000) / 100;
    }

    return 0;
  },
  existOwnOrder(companyId) {
    const userId = Meteor.user()._id;

    return ! ! dbOrders.findOne({ companyId, userId });
  },
  ownOrderList(companyId) {
    const userId = Meteor.user()._id;

    return dbOrders.find({ companyId, userId });
  },
  currentUserCanManage(company) {
    return isCurrentUser(company.manager) || currentUserHasRole('fscMember');
  }
};
const companyListEvents = {
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
  'click [data-toggle-favorite]'(event) {
    event.preventDefault();
    const companyId = $(event.currentTarget).attr('data-toggle-favorite');
    toggleFavorite(companyId);
  },
  'click [data-expand-order]'(event, templateInstance) {
    event.preventDefault();
    const panel = templateInstance.$('.order-panel');
    const maxHeight = panel.css('max-height');
    if (maxHeight === '0px') {
      panel.css('max-height', panel.prop('scrollHeight'));
    }
    else {
      panel.css('max-height', 0);
    }
  },
  'click [data-cancel-order]'(event) {
    event.preventDefault();
    const orderId = $(event.currentTarget).attr('data-cancel-order');
    const orderData = dbOrders.findOne(orderId);
    retrieveOrder(orderData);
  }
};
Template.companyListCard.helpers(companyListHelpers);
Template.companyListCard.events(companyListEvents);
Template.companyListTable.helpers(companyListHelpers);
Template.companyListTable.events(companyListEvents);
