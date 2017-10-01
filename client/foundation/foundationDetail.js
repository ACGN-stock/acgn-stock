'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbFoundations } from '../../db/dbFoundations';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { formatDateTimeText } from '../utils/helpers';
import { config } from '../../config';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';
const rShowAllTags = new ReactiveVar(false);

inheritedShowLoadingOnSubscribing(Template.foundationDetail);
Template.foundationDetail.onCreated(function() {
  rShowAllTags.set(false);
  this.autorun(() => {
    const foundationId = FlowRouter.getParam('foundationId');
    if (foundationId) {
      const foundationData = dbFoundations.findOne(foundationId);
      if (foundationData) {
        DocHead.setTitle(config.websiteName + ' - 「' + foundationData.companyName + '」公司資訊');
      }
    }
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const foundationId = FlowRouter.getParam('foundationId');
    if (foundationId) {
      this.subscribe('foundationDetail', foundationId);
    }
  });
});
Template.foundationDetail.helpers({
  foundationData() {
    const foundationId = FlowRouter.getParam('foundationId');

    return dbFoundations.findOne(foundationId);
  },
  getEditHref(foundationId) {
    return FlowRouter.path('editFoundationPlan', {foundationId});
  },
  showAllTags(tags) {
    if (tags.length <= 4) {
      return true;
    }

    return rShowAllTags.get();
  },
  firstFewTags(tags) {
    return tags.slice(0, 3);
  }
});
Template.foundationDetail.events({
  'click [data-action="changeCompanyName"]'(event) {
    event.preventDefault();
    const foundationId = FlowRouter.getParam('foundationId');
    const companyData = dbFoundations.findOne(foundationId, {
      fields: {
        companyName: 1
      }
    });
    alertDialog.dialog({
      type: 'prompt',
      title: '公司更名',
      message: `請輸入新的公司名稱：`,
      defaultValue: companyData.companyName,
      callback: function(companyName) {
        if (companyName) {
          Meteor.customCall('changeFoundCompanyName', foundationId, companyName);
        }
      }
    });
  },
  'click [data-action="showAllTags"]'(event) {
    event.preventDefault();
    rShowAllTags.set(true);
  }
});

//是否展開面板
const rDisplayPanelList = new ReactiveVar([]);
const getTotalInvest = function(investList) {
  return _.reduce(investList, (totalInvest, investData) => {
    return totalInvest + investData.amount;
  }, 0);
};
const getStockPrice = function(investList) {
  const minReleaseStock = config.minReleaseStock;
  const totalInvest = getTotalInvest(investList);
  let stockUnitPrice = 1;
  while (Math.ceil(totalInvest / stockUnitPrice / 2) > minReleaseStock) {
    stockUnitPrice *= 2;
  }
  let totalRelease;
  const mapper = (invest) => {
    return Math.floor(invest.amount / stockUnitPrice);
  };
  const reducer = (sum, stocks) => {
    return sum + stocks;
  };
  do {
    totalRelease = _.reduce(_.map(investList, mapper), reducer, 0);
    if (totalRelease < minReleaseStock) {
      stockUnitPrice /= 2;
    }
  }
  while (totalRelease < minReleaseStock);

  return stockUnitPrice;
};
Template.foundationDetailTable.helpers({
  isDisplayPanel(panelType) {
    return _.contains(rDisplayPanelList.get(), panelType);
  },
  investPplsNumberClass(investNumber) {
    return (investNumber >= config.foundationNeedUsers) ? 'text-success' : 'text-danger';
  },
  foundationNeedUsers() {
    return config.foundationNeedUsers;
  },
  getTotalInvest(investList) {
    return getTotalInvest(investList);
  },
  getExpireDateText(createdAt) {
    const expireDate = new Date(createdAt.getTime() + config.foundExpireTime);

    return formatDateTimeText(expireDate);
  },
  getStockPrice(investList) {
    if (investList.length < config.foundationNeedUsers) {
      return 0;
    }

    return getStockPrice(investList);
  },
  getStockRelease(investList) {
    if (investList.length < config.foundationNeedUsers) {
      return 0;
    }
    const price = getStockPrice(investList);

    return _.reduce(investList, (totalStock, investData) => {
      return totalStock + Math.floor(investData.amount / price);
    }, 0);
  }
});
Template.foundationDetailTable.events({
  'click [data-toggle-panel]'(event) {
    event.preventDefault();
    const $emitter = $(event.currentTarget);
    const panelType = $emitter.attr('data-toggle-panel');
    const displayPanelList = rDisplayPanelList.get();
    if (_.contains(displayPanelList, panelType)) {
      rDisplayPanelList.set(_.without(displayPanelList, panelType));
    }
    else {
      displayPanelList.push(panelType);
      rDisplayPanelList.set(displayPanelList);
    }
  }
});

Template.foundationFounderList.helpers({
  orderedInvestList() {
    const foundationId = FlowRouter.getParam('foundationId');
    const foundation = dbFoundations.findOne(foundationId);

    return _.sortBy(foundation.invest, 'amount').reverse();
  },
  getPercentage(amount) {
    const foundationId = FlowRouter.getParam('foundationId');
    const foundation = dbFoundations.findOne(foundationId);

    return (100 * amount / getTotalInvest(foundation.invest)).toFixed(2);
  }
});
