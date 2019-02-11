import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbViolationCases, categoryMap, stateMap, categoryDisplayName, stateDisplayName } from '/db/dbViolationCases';
import { getCurrentPage } from '/routes';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { stateBadgeClass, pathForViolationCaseDetail } from './helpers';

inheritedShowLoadingOnSubscribing(Template.violationCaseList);

Template.violationCaseList.onCreated(function() {
  this.onlyUnread = new ReactiveVar(false);
  this.category = new ReactiveVar();
  this.state = new ReactiveVar();
  this.violatorUserId = new ReactiveVar();
  this.offset = new ReactiveVar(0);

  this.updateViolatorUserId = (id) => {
    this.violatorUserId.set(id || undefined);
  };

  this.clearViolatorUserId = () => {
    this.violatorUserId.set(undefined);
  };

  this.onSearchViolatorUser = () => {
    this.updateViolatorUserId(this.$('[name="violatorUserId"]').val().trim());
  };

  this.onClearViolatorUser = () => {
    this.clearViolatorUserId();
  };

  this.autorun(() => {
    if (getCurrentPage() !== 'violationCaseList') {
      return;
    }

    this.onlyUnread.set(!! FlowRouter.getQueryParam('onlyUnread') || false);
    this.category.set(FlowRouter.getQueryParam('category'));
    this.state.set(FlowRouter.getQueryParam('state'));
    this.violatorUserId.set(FlowRouter.getQueryParam('violatorUserId'));
    this.offset.set(parseInt(FlowRouter.getQueryParam('offset'), 10) || 0);
  });

  this.autorunWithIdleSupport(() => {
    const onlyUnread = this.onlyUnread.get();
    const category = this.category.get();
    const state = this.state.get();
    const violatorUserId = this.violatorUserId.get();
    const offset = this.offset.get();

    FlowRouter.withReplaceState(() => {
      FlowRouter.setQueryParams({
        category,
        state,
        violatorUserId,
        onlyUnread: onlyUnread || null,
        offset: offset || null
      });
    });

    const subscribeArgs = { category, state, violatorUserId, onlyUnread, offset };
    this.subscribe('violationCaseList', subscribeArgs);
  });
});

Template.violationCaseList.events({
  'change select[name="category"]': _.debounce(function(event, templateInstance) {
    event.preventDefault();
    templateInstance.category.set(templateInstance.$(event.currentTarget).val() || undefined);
  }, 250),
  'change select[name="state"]': _.debounce(function(event, templateInstance) {
    event.preventDefault();
    templateInstance.state.set(templateInstance.$(event.currentTarget).val() || undefined);
  }, 250),
  'click [data-action="searchViolatorUser"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.onSearchViolatorUser();
  },
  'click [data-action="clearViolatorUser"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.onClearViolatorUser();
  },
  'keydown [name="violatorUserId"]'(event, templateInstance) {
    switch (event.which) {
      case 13: // return
        event.preventDefault();
        templateInstance.onSearchViolatorUser();
        break;
      case 27: // esc
        event.preventDefault();
        templateInstance.onClearViolatorUser();
        break;
    }
  }
});

Template.violationCaseList.helpers({
  categoryDisplayName,
  stateDisplayName,
  stateBadgeClass,
  pathForViolationCaseDetail,
  onlyUnreadButtonArgs() {
    const templateInstance = Template.instance();

    return {
      class: 'btn btn-sm btn-info ml-1',
      text: '只顯示未讀',
      name: 'onlyUnread',
      checked: templateInstance.onlyUnread.get(),
      onChanged: (checked) => {
        templateInstance.onlyUnread.set(checked);
      }
    };
  },
  categoryList() {
    return Object.keys(categoryMap);
  },
  categorySelectedAttr(category) {
    return Template.instance().category.get() === category ? 'selected' : '';
  },
  stateList() {
    return Object.keys(stateMap);
  },
  stateSelectedAttr(state) {
    return Template.instance().state.get() === state ? 'selected' : '';
  },
  violatorUserId() {
    return Template.instance().violatorUserId.get();
  },
  violationCases() {
    return dbViolationCases.find({}, { sort: { createdAt: -1 } });
  },
  violationCaseCardClass({ isUnread }) {
    return `violation-case-card ${isUnread ? 'unread' : ''}`;
  },
  paginationData() {
    return {
      counterName: 'violationCases',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.violationCases,
      offset: Template.instance().offset
    };
  }
});
