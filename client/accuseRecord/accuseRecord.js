'use strict';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbLog, accuseLogTypeList } from '../../db/dbLog';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { shouldStopSubscribe } from '../utils/idle';

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
