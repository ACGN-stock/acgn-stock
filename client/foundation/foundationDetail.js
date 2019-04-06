import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { getCurrentPageFullTitle } from '/routes';
import { dbLog } from '/db/dbLog';
import { dbVariables } from '/db/dbVariables';
import { formatShortDateTimeText } from '/common/imports/utils/formatTimeUtils';
import { setPrerenderTitleReady } from '/client/utils/prerenderReady';

import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { shouldStopSubscribe } from '../utils/idle';
import { investFoundCompany, markCompanyIllegal, unmarkCompanyIllegal, changeCompanyName } from '../utils/methods';
import { paramFoundation, paramFoundationId } from './helpers';

const rShowAllTags = new ReactiveVar(false);

inheritedShowLoadingOnSubscribing(Template.foundationDetail);
Template.foundationDetail.onCreated(function() {
  rShowAllTags.set(false);

  this.autorun(() => {
    const foundationData = paramFoundation();
    if (foundationData) {
      DocHead.setTitle(getCurrentPageFullTitle(foundationData.companyName));
      setPrerenderTitleReady(true);
    }
    else {
      setPrerenderTitleReady(false);
    }
  });

  this.autorunWithIdleSupport(() => {
    const foundationId = paramFoundationId();
    if (foundationId) {
      this.subscribe('foundationDetail', foundationId);
    }
  });
});
Template.foundationDetail.helpers({
  pathForReportCompanyViolation() {
    return FlowRouter.path('reportViolation', null, { type: 'company', id: paramFoundationId() });
  },
  foundationData() {
    return paramFoundation();
  },
  getEditHref(foundationId) {
    return FlowRouter.path('editFoundationPlan', { foundationId });
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
    changeCompanyName(paramFoundation());
  },
  'click [data-action="showAllTags"]'(event) {
    event.preventDefault();
    rShowAllTags.set(true);
  },
  'click [data-action="markCompanyIllegal"]'(event) {
    event.preventDefault();
    markCompanyIllegal(paramFoundationId());
  },
  'click [data-action="unmarkCompanyIllegal"]'(event) {
    event.preventDefault();
    unmarkCompanyIllegal(paramFoundationId());
  },
  'click [data-action="invest"]'(event) {
    event.preventDefault();
    investFoundCompany(paramFoundationId());
  }
});

// 是否展開面板
const rDisplayPanelList = new ReactiveVar([]);
const getTotalInvest = function(investList) {
  return _.reduce(investList, (totalInvest, investData) => {
    return totalInvest + investData.amount;
  }, 0);
};
const getStockPrice = function(investList) {
  const minReleaseStock = Meteor.settings.public.minReleaseStock;
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
    return (investNumber >= dbVariables.get('foundation.minInvestorCount')) ? 'text-success' : 'text-danger';
  },
  minInvestorCount() {
    return dbVariables.get('foundation.minInvestorCount');
  },
  getTotalInvest(investList) {
    return getTotalInvest(investList);
  },
  getExpireDateText(createdAt) {
    const expireDate = new Date(createdAt.getTime() + Meteor.settings.public.foundExpireTime);

    return formatShortDateTimeText(expireDate);
  },
  getStockPrice(investList) {
    if (investList.length < dbVariables.get('foundation.minInvestorCount')) {
      return 0;
    }

    return getStockPrice(investList);
  },
  getStockRelease(investList) {
    if (investList.length < dbVariables.get('foundation.minInvestorCount')) {
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
    const { invest } = paramFoundation();

    return _.pluck(invest.map((x, i) => {
      return [x, i];
    }).sort(([a, ai], [b, bi]) => {
      // 對 amount 反向排序，如相同則以原始順序決定前後
      return b.amount - a.amount || ai - bi;
    }), 0);
  },
  getPercentage(amount) {
    const { invest } = paramFoundation();

    return (100 * amount / getTotalInvest(invest)).toFixed(2);
  }
});

const rIsOnlyShowMine = new ReactiveVar(false);
const rLogOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.foundationLogList);
Template.foundationLogList.onCreated(function() {
  rLogOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = paramFoundationId();
    if (companyId) {
      this.subscribe('companyLog', companyId, rIsOnlyShowMine.get(), rLogOffset.get());
    }
  });
});
Template.foundationLogList.helpers({
  onlyShowMine() {
    return rIsOnlyShowMine.get();
  },
  logList() {
    const companyId = paramFoundationId();

    return dbLog.find({ companyId }, { sort: { createdAt: -1 }, limit: 30 });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfcompanyLog',
      dataNumberPerPage: 30,
      offset: rLogOffset
    };
  }
});
Template.foundationLogList.events({
  'click button'(event) {
    event.preventDefault();
    rIsOnlyShowMine.set(! rIsOnlyShowMine.get());
  }
});
