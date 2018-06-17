import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';

import { inheritedShowLoadingOnSubscribing } from '/client/layout/loading';
import { dbLog, fscLogTypeList } from '/db/dbLog';

inheritedShowLoadingOnSubscribing(Template.fscLogs);

Template.fscLogs.onCreated(function() {
  this.offset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const offset = this.offset.get();
    this.subscribe('fscLogs', { offset });
  });
});

Template.fscLogs.helpers({
  logList() {
    return dbLog.find({ logType: { $in: fscLogTypeList } }, { sort: { createdAt: -1 } });
  },
  paginationData() {
    return {
      counterName: 'fscLogs',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.fscLogs,
      offset: Template.instance().offset
    };
  }
});
