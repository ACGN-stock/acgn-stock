import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbLog, logTypeGroupMap } from '/db/dbLog';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { paramUserId } from './helpers';

inheritedShowLoadingOnSubscribing(Template.accountInfoLogList);

const sharedLogTypeGroups = new ReactiveVar(Object.keys(logTypeGroupMap)); // 需在頁面切換間維持狀態

Template.accountInfoLogList.onCreated(function() {
  this.offset = new ReactiveVar(0);
  this.localLogTypeGroups = new ReactiveVar(sharedLogTypeGroups.get());

  this.autorun(() => {
    const userId = paramUserId();
    const logTypeGroups = sharedLogTypeGroups.get();
    const offset = this.offset.get();
    if (userId) {
      this.subscribe('accountInfoLog', { userId, logTypeGroups, offset });
    }
  });
});

Template.accountInfoLogList.helpers({
  logTypeGroups() {
    return Object.keys(logTypeGroupMap);
  },
  logTypeGroupButtonArgs(group) {
    const templateInstance = Template.instance();
    const localLogTypeGroups = templateInstance.localLogTypeGroups.get();
    const groupIncluded = localLogTypeGroups.includes(group);
    const changed = groupIncluded !== sharedLogTypeGroups.get().includes(group);

    const buttonClass = `btn btn-sm mb-1 ${changed ? 'btn-warning' : 'btn-info'}`;

    return {
      name: group,
      text: logTypeGroupMap[group].displayName,
      checked: groupIncluded,
      class: buttonClass,
      onChanged: (checked) => {
        const logTypeGroupSet = new Set(templateInstance.localLogTypeGroups.get());

        if (checked) {
          logTypeGroupSet.add(group);
        }
        else {
          logTypeGroupSet.delete(group);
        }

        templateInstance.localLogTypeGroups.set([...logTypeGroupSet]);
      }
    };
  },
  logList() {
    const userId = paramUserId();

    return dbLog.find({
      userId: { $in: [userId, '!all'] },
      logType: { $ne: '聊天發言' }
    }, {
      sort: { createdAt: -1 }
    });
  },
  paginationData() {
    return {
      counterName: 'accountInfoLogs',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.accountInfoLogs,
      offset: Template.instance().offset
    };
  }
});

Template.accountInfoLogList.events({
  'click [data-action="apply"]'(event, templateInstance) {
    event.preventDefault();
    sharedLogTypeGroups.set(templateInstance.localLogTypeGroups.get());
  },
  'click [data-action="selectAll"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.localLogTypeGroups.set(Object.keys(logTypeGroupMap));
  },
  'click [data-action="clearAll"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.localLogTypeGroups.set([]);
  }
});
