'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbLog } from '../../db/dbLog';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { config } from '../../config';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';

export const ownStocksOffset = new ReactiveVar(0);
export const logOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.accountInfo);
Template.accountInfo.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      this.subscribe('accountInfo', userId);
    }
  });
  this.autorun(() => {
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      const user = Meteor.users.findOne(userId);
      if (user) {
        DocHead.setTitle(config.websiteName + ' - 「' + user.profile.name + '」帳號資訊');
      }
    }
  });
  ownStocksOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      this.subscribe('accountOwnStocks', userId, ownStocksOffset.get());
    }
  });
  logOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      this.subscribe('accountInfoLog', userId, logOffset.get());
    }
  });
});
Template.accountInfo.helpers({
  lookUser() {
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      return Meteor.users.findOne(userId);
    }
    else {
      return null;
    }
  }
});

Template.accountInfoBasic.helpers({
  manageCompanies() {
    return dbCompanies
      .find({
        manager: this._id
      });
  },
  getCompanyHref(companyId) {
    return FlowRouter.path('company', {companyId});
  },
  isBaned(type) {
    return _.contains(this.profile.ban, type);
  }
});
Template.accountInfoBasic.events({
  'click [data-action="accuse"]'(event, templateInstance) {
    event.preventDefault();
    const accuseUser = templateInstance.data;
    alertDialog.dialog({
      type: 'prompt',
      title: '舉報違規 - ' + accuseUser.profile.name,
      message: `請輸入您要舉報的內容：`,
      callback: function(message) {
        if (message) {
          const userId = accuseUser._id;
          Meteor.customCall('accuseUser', userId, message);
        }
      }
    });
  },
  'click [data-ban]'(event, templateInstance) {
    event.preventDefault();
    const banType = $(event.currentTarget).attr('data-ban');
    let banActionText;
    switch (banType) {
      case 'accuse': {
        banActionText = '禁止舉報違規';
        break;
      }
      case 'deal': {
        banActionText = '禁止投資下單';
        break;
      }
      case 'chat': {
        banActionText = '禁止聊天發言';
        break;
      }
      case 'advertise': {
        banActionText = '禁止廣告宣傳';
        break;
      }
      case 'manager': {
        banActionText = '禁止擔任經理';
        break;
      }
    }
    const accuseUserData = templateInstance.data;
    alertDialog.dialog({
      type: 'prompt',
      title: '違規處理 - ' + accuseUserData.profile.name + ' - ' + banActionText,
      message: `請輸入處理事由：`,
      callback: function(message) {
        if (message) {
          const userId = accuseUserData._id;
          Meteor.customCall('banUser', {userId, message, banType});
        }
      }
    });
  },
  'click [data-action="forfeit"]'(event, templateInstance) {
    event.preventDefault();
    const accuseUserData = templateInstance.data;
    alertDialog.dialog({
      type: 'prompt',
      title: '課以罰金 - ' + accuseUserData.profile.name,
      message: `請輸入處理事由：`,
      callback: function(message) {
        if (message) {
          alertDialog.dialog({
            type: 'prompt',
            title: '課以罰金 - ' + accuseUserData.profile.name,
            message: `請輸入罰金數額：`,
            callback: function(amount) {
              amount = parseInt(amount, 10);
              if (amount && amount > 0) {
                const userId = accuseUserData._id;
                Meteor.customCall('forfeit', {userId, message, amount});
              }
            }
          });
        }
      }
    });
  },
  'click [data-action="returnForfeit"]'(event, templateInstance) {
    event.preventDefault();
    const accuseUserData = templateInstance.data;
    alertDialog.dialog({
      type: 'prompt',
      title: '退還罰金 - ' + accuseUserData.profile.name,
      message: `請輸入處理事由：`,
      callback: function(message) {
        if (message) {
          alertDialog.dialog({
            type: 'prompt',
            title: '退還罰金 - ' + accuseUserData.profile.name,
            message: `請輸入退還金額：`,
            callback: function(amount) {
              amount = parseInt(amount, 10);
              if (amount && amount > 0) {
                const userId = accuseUserData._id;
                amount *= -1;
                Meteor.customCall('forfeit', {userId, message, amount});
              }
            }
          });
        }
      }
    });
  }
});

Template.accountInfoOwnStockList.helpers({
  directorList() {
    const userId = FlowRouter.getParam('userId');

    return dbDirectors.find({userId});
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountOwnStocks',
      dataNumberPerPage: 10,
      offset: ownStocksOffset
    };
  }
});

Template.accountInfoLogList.helpers({
  logList() {
    const userId = FlowRouter.getParam('userId');

    return dbLog.find(
      {
        userId: {
          $in: [userId, '!all']
        },
        logType: {
          $ne: '聊天發言'
        }
      },
      {
        sort: {
          createdAt: -1
        }
      }
    );
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountInfoLog',
      dataNumberPerPage: 30,
      offset: logOffset
    };
  }
});
