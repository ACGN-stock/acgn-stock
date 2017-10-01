'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbFoundations } from '../../db/dbFoundations';
import { formatDateText, isUserId } from '../utils/helpers';
import { config } from '../../config';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';
import { rCompanyListViewMode } from '../utils/styles';

inheritedShowLoadingOnSubscribing(Template.foundationList);
const rKeyword = new ReactiveVar('');
export const rFoundationOffset = new ReactiveVar(0);
Template.foundationList.onCreated(function() {
  rFoundationOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('foundationList', rKeyword.get(), rFoundationOffset.get());
  });
});
Template.foundationList.helpers({
  viewModeIsCard() {
    return rCompanyListViewMode.get() === 'card';
  },
  getFoundCompanyHref() {
    return FlowRouter.path('createFoundationPlan');
  },
  foundationList() {
    return dbFoundations.find({}, {
      sort: {
        createdAt: 1
      },
      limit: 12
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfFoundationPlan',
      dataNumberPerPage: 12,
      offset: rFoundationOffset,
      useHrefRoute: true
    };
  }
});

Template.foundationListFilterForm.onRendered(function() {
  this.$keyword = this.$('[name="keyword"]');
});
Template.foundationListFilterForm.helpers({
  viewModeBtnClass() {
    if (rCompanyListViewMode.get() === 'card') {
      return 'fa-th';
    }

    return 'fa-th-list';
  },
  keyword() {
    return rKeyword.get();
  }
});
Template.foundationListFilterForm.events({
  'click [data-action="toggleViewMode"]'(event) {
    event.preventDefault();
    let mode = 'card';
    if (rCompanyListViewMode.get() === mode) {
      mode = 'form';
    }
    rCompanyListViewMode.set(mode);
    FlowRouter.go('foundationList', {
      page: 1
    });
  },
  submit(event, templateInstance) {
    event.preventDefault();
    rKeyword.set(templateInstance.$keyword.val());
    FlowRouter.go('foundationList', {
      page: 1
    });
  }
});

const foundationListHelpers = {
  displayTagList(tagList) {
    return tagList.join('、');
  },
  investPplsNumberClass(investNumber) {
    return (investNumber >= config.foundationNeedUsers) ? 'text-success' : 'text-danger';
  },
  foundationNeedUsers() {
    return config.foundationNeedUsers;
  },
  getTotalInvest(investList) {
    return _.reduce(investList, (totalInvest, investData) => {
      return totalInvest + investData.amount;
    }, 0);
  },
  getExpireDateText(createdAt) {
    const expireDate = new Date(createdAt.getTime() + config.foundExpireTime);

    return formatDateText(expireDate);
  },
  getEditHref(foundationId) {
    return FlowRouter.path('editFoundationPlan', {foundationId});
  },
  alreadyInvest() {
    const user = Meteor.user();
    if (user) {
      const userId = user._id;
      const invest = this.invest;
      const investData = _.findWhere(invest, {userId});
      if (investData) {
        return investData.amount;
      }
    }

    return 0;
  },
  cardDisplayClass() {
    if (! Meteor.user()) {
      return 'company-card-default';
    }
    if (isUserId(this.manager)) {
      return 'company-card-manager';
    }
    const invest = this.invest;
    const userId = Meteor.user()._id;
    const investData = _.findWhere(invest, {userId});
    if (investData) {
      return 'company-card-holder';
    }

    return 'company-card-default';
  }
};
const foundationListEvents = {
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
  'click [data-action="invest"]'(event, templaceInstance) {
    event.preventDefault();
    const user = Meteor.user();
    if (! user) {
      return false;
    }
    const userId = user._id;
    const minimumInvest = Math.ceil(config.minReleaseStock / config.foundationNeedUsers);
    const foundationData = templaceInstance.data;
    const alreadyInvest = _.findWhere(foundationData.invest, {userId});
    const alreadyInvestAmount = alreadyInvest ? alreadyInvest.amount : 0;
    const maximumInvest = Math.min(Meteor.user().profile.money, config.maximumInvest - alreadyInvestAmount);
    if (minimumInvest > maximumInvest) {
      alertDialog.alert('您的投資已達上限或剩餘金錢不足以進行投資！');

      return false;
    }

    alertDialog.dialog({
      type: 'prompt',
      title: '投資',
      message: `
        要投資多少金額？(${minimumInvest}~${maximumInvest})
        <div class="text-danger">
          投資理財有賺有賠，請先確認您要投資的公司是否符合
          <a href="https://docs.google.com/document/d/1INBDMg1MFOcEucdJDO57qIkTsFR7iNiZpC2JW2qoYso/edit?usp=sharing" target="_blank">金管會的規定</a>。
        </div>
      `,
      defaultValue: null,
      callback: function(result) {
        const amount = parseInt(result, 10);
        if (! amount) {
          return false;
        }
        if (amount >= minimumInvest && amount <= maximumInvest) {
          Meteor.customCall('investFoundCompany', templaceInstance.data._id, amount);
        }
        else {
          alertDialog.alert('不正確的金額數字！');
        }
      }
    });
  }
};
Template.foundationListCard.helpers(foundationListHelpers);
Template.foundationListCard.events(foundationListEvents);
Template.foundationListTable.helpers(foundationListHelpers);
Template.foundationListTable.events(foundationListEvents);
