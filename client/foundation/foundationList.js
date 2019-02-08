import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbFoundations } from '/db/dbFoundations';
import { dbVariables } from '/db/dbVariables';
import { formatDateTimeText } from '/common/imports/utils/formatTimeUtils';

import { isCurrentUser } from '../utils/helpers';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';
import { rCompanyListViewMode } from '../utils/styles';
import { investFoundCompany } from '../utils/methods';

inheritedShowLoadingOnSubscribing(Template.foundationList);
const rKeyword = new ReactiveVar('');
const rMatchType = new ReactiveVar('exact');
export const rFoundationOffset = new ReactiveVar(0);
Template.foundationList.onCreated(function() {
  this.autorun(() => {
    const page = parseInt(FlowRouter.getParam('page'), 10);

    if (! page) {
      return;
    }

    const offset = (page - 1) * 12;
    rFoundationOffset.set(offset);
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('foundationList', {
      keyword: rKeyword.get(),
      matchType: rMatchType.get(),
      offset: rFoundationOffset.get()
    });
  });
});
Template.foundationList.helpers({
  viewModeIsCard() {
    return rCompanyListViewMode.get() === 'card';
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
Template.foundationList.events({
  'click [data-action="createFoundation"]'(event) {
    event.preventDefault();
    const user = Meteor.user();
    if (user.profile.money < Meteor.settings.public.founderEarnestMoney) {
      alertDialog.alert('您的投資已達上限或剩餘金錢不足以進行投資！');

      return false;
    }
    FlowRouter.go('createFoundationPlan');
  }
});

Template.foundationListFilterForm.onRendered(function() {
  this.$keyword = this.$('[name="keyword"]');
  this.$matchType = this.$('[name="matchType"]');
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
  },
  showMatchTypeSelectedAttr(matchType) {
    return matchType === rMatchType.get() ? 'selected' : '';
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
    rMatchType.set(templateInstance.$matchType.val());
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
    return (investNumber >= dbVariables.get('foundation.minInvestorCount')) ? 'text-success' : 'text-danger';
  },
  minInvestorCount() {
    return dbVariables.get('foundation.minInvestorCount');
  },
  getTotalInvest(investList) {
    return _.reduce(investList, (totalInvest, investData) => {
      return totalInvest + investData.amount;
    }, 0);
  },
  getExpireDateText(createdAt) {
    const expireDate = new Date(createdAt.getTime() + Meteor.settings.public.foundExpireTime);

    return formatDateTimeText(expireDate);
  },
  getEditHref(foundationId) {
    return FlowRouter.path('editFoundationPlan', { foundationId });
  },
  alreadyInvest() {
    const user = Meteor.user();
    if (user) {
      const userId = user._id;
      const invest = this.invest;
      const investData = _.findWhere(invest, { userId });
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
    if (isCurrentUser(this.manager)) {
      return 'company-card-manager';
    }
    if (isCurrentUser(this.founder)) {
      return 'company-card-founder';
    }
    const invest = this.invest;
    const userId = Meteor.user()._id;
    const investData = _.findWhere(invest, { userId });
    if (investData) {
      return 'company-card-holder';
    }

    return 'company-card-default';
  }
};
const foundationListEvents = {
  'click [data-action="invest"]'(event, templateInstance) {
    event.preventDefault();
    investFoundCompany(templateInstance.data._id);
  }
};
Template.foundationListCard.helpers(foundationListHelpers);
Template.foundationListCard.events(foundationListEvents);
Template.foundationListTable.helpers(foundationListHelpers);
Template.foundationListTable.events(foundationListEvents);
