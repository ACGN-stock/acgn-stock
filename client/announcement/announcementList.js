import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbAnnouncements, announcementCategoryMap, categoryDisplayName } from '/db/dbAnnouncements';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { canCreateAnnouncement } from './helpers';

inheritedShowLoadingOnSubscribing(Template.announcementList);

Template.announcementList.onCreated(function() {
  this.onlyUnread = new ReactiveVar(false);
  this.showVoided = new ReactiveVar(false);
  this.category = new ReactiveVar();
  this.offset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const onlyUnread = this.onlyUnread.get();
    const showVoided = this.showVoided.get();
    const category = this.category.get();
    const offset = this.offset.get();

    this.subscribe('announcementList', { category, onlyUnread, showVoided, offset });
  });
});

Template.announcementList.events({
  'change select[name="category"]': _.debounce(function(event, templateInstance) {
    event.preventDefault();
    templateInstance.category.set(templateInstance.$(event.currentTarget).val() || undefined);
  }, 250),
  'click button[name="onlyUnread"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.onlyUnread.set(! templateInstance.onlyUnread.get());
  },
  'click button[name="showVoided"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.showVoided.set(! templateInstance.showVoided.get());
  },
  'click [data-action="markAllAsRead"]'(event) {
    event.preventDefault();

    alertDialog.confirm({
      message: '確定要將所有公告標為已讀嗎？',
      callback(result) {
        if (! result) {
          return;
        }

        Meteor.customCall('markAllAnnouncementsAsRead');
      }
    });
  }
});

Template.announcementList.helpers({
  canCreateAnnouncement,
  categoryDisplayName,
  onlyUnreadButtonArgs() {
    const templateInstance = Template.instance();

    return {
      class: 'btn btn-sm btn-info ml-1',
      text: '只顯示未讀',
      name: 'onlyUnread',
      onChanged: (checked) => {
        templateInstance.onlyUnread.set(checked);
      }
    };
  },
  showVoidedButtonArgs() {
    const templateInstance = Template.instance();

    return {
      class: 'btn btn-sm btn-info ml-1',
      text: '顯示已作廢',
      name: 'showVoided',
      onChanged: (checked) => {
        templateInstance.showVoided.set(checked);
      }
    };
  },
  categorySelectedAttr(category) {
    return Template.instance().category.get() === category ? 'selected' : '';
  },
  categoryList() {
    return Object.keys(announcementCategoryMap);
  },
  announcements() {
    return dbAnnouncements.find({}, { sort: { createdAt: -1 } });
  },
  pathForAnnouncementDetail(announcementId) {
    return FlowRouter.path('announcementDetail', { announcementId });
  },
  paginationData() {
    return {
      counterName: 'announcements',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.announcements,
      offset: Template.instance().offset
    };
  }
});
