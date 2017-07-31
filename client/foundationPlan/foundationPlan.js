'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbFoundations } from '../../db/dbFoundations';
import { formatDateText } from '../utils/helpers';
import { config } from '../../config';
import { addTask, resolveTask } from '../layout/loading';

Template.foundationPlan.onCreated(function() {
  addTask();
  this.subscribe('foundationPlan', resolveTask);
});
Template.foundationPlan.helpers({
  getFoundCompanyHref() {
    return FlowRouter.path('foundCompany');
  },
  foundationList() {
    return dbFoundations.find({}, {
      sort: {
        createdAt: 1
      }
    });
  }
});

Template.foundationPlanInfo.helpers({
  displayTagList(tagList) {
    return tagList.join('、');
  },
  investPplsNumberClass(investNumber) {
    return (investNumber >= config.foundationNeedUsers) ? 'col content text-success text-right' : 'col content text-danger text-right';
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
  // isManager(manager) {
  //   return Meteor.user().username === manager;
  // }
  isManager() {
    return false;
  },
  getEditHref(foundationId) {
    return FlowRouter.path('editFoundationPlan', {foundationId});
  },
  alreadyInvest(investList) {
    const username = Meteor.user().username;
    const investData = _.findWhere(investList, {username});

    return investData ? investData.amount : 0;
  }
});
Template.foundationPlanInfo.events({
  'click [data-action="invest"]'(event, templaceInstance) {
    event.preventDefault();
    const minimumInvest = Math.ceil(config.beginReleaseStock / config.foundationNeedUsers);
    const maximumInvest = Meteor.user().profile.money;
    const amount = parseInt(window.prompt(`要投資多少金額？(${minimumInvest}~${maximumInvest})`), 10);
    if (amount >= minimumInvest && amount <= maximumInvest) {
      Meteor.call('investFoundCompany', templaceInstance.data._id, amount);
    }
    else {
      window.alert('不正確的金額數字！');
    }
  }
});
