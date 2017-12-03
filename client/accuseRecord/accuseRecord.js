'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbLog, accuseLogTypeList } from '/db/dbLog';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { shouldStopSubscribe } from '../utils/idle';
import { alertDialog } from '../layout/alertDialog';

export const logOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.accuseRecord);
Template.accuseRecord.onCreated(function() {
  logOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('accuseRecord', logOffset.get());
  });
});
Template.accuseRecord.helpers({
  accuseList() {
    return dbLog.find(
      {
        logType: {
          $in: accuseLogTypeList
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
      useVariableForTotalCount: 'totalCountOfAccuseRecord',
      dataNumberPerPage: 30,
      offset: logOffset
    };
  }
});
Template.accuseRecord.events({
  'click [data-action="announcement"]'(event) {
    event.preventDefault();
    alertDialog.dialog({
      type: 'prompt',
      title: '金管會通告 - 選擇使用者',
      message: `請輸入要通告的使用者識別碼：<br />（可不輸入，多於一位玩家時需以,分隔）`,
      callback: function(userIdStringList) {
        const userIds = userIdStringList ? _.compact(userIdStringList.split(',')) : [];
        alertDialog.dialog({
          type: 'prompt',
          title: '金管會通告 - 輸入通知訊息',
          message: `請輸入要通告的訊息：`,
          callback: function(message) {
            if (message) {
              Meteor.customCall('fscAnnouncement', { userIds, message });
            }
          }
        });
      }
    });
  },
  'click [data-action="contactFsc"]'(event) {
    event.preventDefault();
    alertDialog.dialog({
      type: 'prompt',
      title: '聯絡金管會',
      message: `請輸入要告知金管會的訊息：<br />（若要舉報使用者，請在該使用者的帳號資訊頁面進行舉報。）`,
      callback: function(message) {
        if (message) {
          Meteor.customCall('contactFsc', message);
        }
      }
    });
  }
});
