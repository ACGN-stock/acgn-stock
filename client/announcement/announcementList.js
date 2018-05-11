import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbAnnouncements, announcementCategoryMap, categoryDisplayName } from '/db/dbAnnouncements';
import { canCreateAnnouncement } from './helpers';

Template.announcementList.onCreated(function() {
  this.onlyUnread = new ReactiveVar(false);
  this.category = new ReactiveVar();
  this.offset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const onlyUnread = this.onlyUnread.get();
    const category = this.category.get();
    const offset = this.offset.get();

    this.subscribe('announcementList', { category, onlyUnread, offset });
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
  }
});

Template.announcementList.helpers({
  canCreateAnnouncement,
  categoryDisplayName,
  onlyUnread() {
    return Template.instance().onlyUnread.get();
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
