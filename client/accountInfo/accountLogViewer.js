import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbLog, accuseLogTypeList } from '/db/dbLog';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { paramUserId } from './helpers';

const accountLogViewerMode = new ReactiveVar('accuse');
Template.accountLogViewer.helpers({
  onlyViewAccuse() {
    return accountLogViewerMode.get() === 'accuse';
  }
});

inheritedShowLoadingOnSubscribing(Template.accountAccuseLogList);
Template.accountAccuseLogList.onCreated(function() {
  this.accuseOffset = new ReactiveVar(0);

  this.autorun(() => {
    const userId = paramUserId();

    if (userId) {
      const offset = this.accuseOffset.get();
      this.subscribe('accountAccuseLog', userId, offset);
    }
  });
});
Template.accountAccuseLogList.helpers({
  accuseList() {
    const userId = paramUserId();

    return dbLog.find(
      {
        userId: userId,
        logType: {
          $in: accuseLogTypeList
        }
      },
      {
        sort: {
          createdAt: -1
        },
        limit: 10
      }
    );
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountAccuseLog',
      dataNumberPerPage: 10,
      offset: Template.instance().accuseOffset
    };
  }
});
Template.accountAccuseLogList.events({
  'click button'(event) {
    event.preventDefault();
    accountLogViewerMode.set('all');
  }
});

inheritedShowLoadingOnSubscribing(Template.accountInfoLogList);
Template.accountInfoLogList.onCreated(function() {
  this.logOffset = new ReactiveVar(0);

  this.autorun(() => {
    const userId = paramUserId();

    if (userId) {
      const offset = this.logOffset.get();
      this.subscribe('accountInfoLog', userId, offset);
    }
  });
});
Template.accountInfoLogList.helpers({
  logList() {
    const userId = paramUserId();

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
        },
        limit: 30
      }
    );
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountInfoLog',
      dataNumberPerPage: 30,
      offset: Template.instance().logOffset
    };
  }
});
Template.accountInfoLogList.events({
  'click button'(event) {
    event.preventDefault();
    accountLogViewerMode.set('accuse');
  }
});
