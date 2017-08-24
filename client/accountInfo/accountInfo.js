'use strict';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbLog } from '../../db/dbLog';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbResourceLock } from '../../db/dbResourceLock';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { config } from '../../config';

export const ownStocksOffset = new ReactiveVar(0);
export const logOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.accountInfo);
Template.accountInfo.onCreated(function() {
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
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
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      this.subscribe('accountOwnStocks', userId, ownStocksOffset.get());
    }
  });
  logOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
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
