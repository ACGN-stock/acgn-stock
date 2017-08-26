'use strict';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbFoundations } from '../../db/dbFoundations';
import { dbResourceLock } from '../../db/dbResourceLock';
import { formatDateText } from '../utils/helpers';
import { config } from '../../config';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { AlertDialog } from '../layout/alertDialog';

inheritedShowLoadingOnSubscribing(Template.foundationPlan);
const rKeyword = new ReactiveVar('');
const rFoundationOffset = new ReactiveVar(0);
Template.foundationPlan.onCreated(function() {
  rFoundationOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    this.subscribe('foundationPlan', rKeyword.get(), rFoundationOffset.get());
  });
});
Template.foundationPlan.helpers({
  getFoundCompanyHref() {
    return FlowRouter.path('foundCompany');
  },
  foundationList() {
    return dbFoundations.find({}, {
      sort: {
        createdAt: 1
      },
      limit: rFoundationOffset.get() + 10
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfFoundationPlan',
      dataNumberPerPage: 10,
      offset: rFoundationOffset
    };
  }
});

Template.foundationFilterForm.onRendered(function() {
  this.$keyword = this.$('[name="keyword"]');
});
Template.foundationFilterForm.helpers({
  keyword() {
    return rKeyword.get();
  }
});
Template.foundationFilterForm.events({
  submit(event, templateInstance) {
    event.preventDefault();
    rKeyword.set(templateInstance.$keyword.val());
    rFoundationOffset.set(0);
  }
});

Template.foundationPlanInfo.onCreated(function() {
  this.rPicture = new ReactiveVar('');
  $.ajax({
    url: '/foundationPicture',
    data: {
      id: this.data._id
    },
    success: (response) => {
      this.rPicture.set(response);
    }
  });
});
Template.foundationPlanInfo.helpers({
  getPicture() {
    const templateInstance = Template.instance();

    return templateInstance.rPicture.get();
  },
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
  }
});
Template.foundationPlanInfo.events({
  'click [data-action="invest"]'(event, templaceInstance) {
    event.preventDefault();
    const minimumInvest = Math.ceil(config.minReleaseStock / config.foundationNeedUsers);
    const maximumInvest = Meteor.user().profile.money;
    if (minimumInvest > maximumInvest) {
      AlertDialog.alert('您的金錢不足以進行投資！');

      return false;
    }

    AlertDialog.promptWithTitle('投資', `要投資多少金額？(${minimumInvest}~${maximumInvest})`, function(result) {
      const amount = parseInt(result);
      if (! amount) {
        return false;
      }
      if (amount >= minimumInvest && amount <= maximumInvest) {
        Meteor.call('investFoundCompany', templaceInstance.data._id, amount);
      }
      else {
        AlertDialog.alert('不正確的金額數字！');
      }
    });
  }
});
