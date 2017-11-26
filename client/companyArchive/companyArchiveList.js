'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { shouldStopSubscribe } from '../utils/idle';
import { rCompanyListViewMode } from '../utils/styles';
import { investArchiveCompany } from '../utils/methods';

inheritedShowLoadingOnSubscribing(Template.companyArchiveList);
const rKeyword = new ReactiveVar('');
const rMatchType = new ReactiveVar('exact');
export const rArchiveOffset = new ReactiveVar(0);
Template.companyArchiveList.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('companyArchiveList', {
      keyword: rKeyword.get(),
      matchType: rMatchType.get(),
      offset: rArchiveOffset.get()
    });
  });
});
Template.companyArchiveList.helpers({
  viewModeIsCard() {
    return rCompanyListViewMode.get() === 'card';
  },
  companyArchiveList() {
    return dbCompanyArchive.find({}, {
      limit: 12
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfCompanyArchiveList',
      dataNumberPerPage: 12,
      offset: rArchiveOffset,
      useHrefRoute: true
    };
  }
});

Template.companyArchiveListFilterForm.onRendered(function() {
  this.$keyword = this.$('[name="keyword"]');
  this.$matchType = this.$('[name="matchType"]');
});
Template.companyArchiveListFilterForm.helpers({
  viewModeBtnClass() {
    if (rCompanyListViewMode.get() === 'card') {
      return 'fa-th';
    }

    return 'fa-th-list';
  },
  keyword() {
    return rKeyword.get();
  },
  showMatchTypeSelectedAttr(matchType) {
    return matchType === rMatchType.get() ? 'selected' : '';
  }
});
Template.companyArchiveListFilterForm.events({
  'click [data-action="toggleViewMode"]'(event) {
    event.preventDefault();
    let mode = 'card';
    if (rCompanyListViewMode.get() === mode) {
      mode = 'form';
    }
    rCompanyListViewMode.set(mode);
    FlowRouter.go('companyArchiveList', {
      page: 1
    });
  },
  submit(event, templateInstance) {
    event.preventDefault();
    rKeyword.set(templateInstance.$keyword.val());
    rMatchType.set(templateInstance.$matchType.val());
    FlowRouter.go('companyArchiveList', {
      page: 1
    });
  }
});

const companyArchiveListHelpers = {
  displayTagList(tagList) {
    return tagList.join('、');
  },
  investPplsNumberClass(investNumber) {
    return (investNumber >= Meteor.settings.public.archiveReviveNeedUsers) ? 'text-success' : 'text-danger';
  },
  archiveReviveNeedUsers() {
    return Meteor.settings.public.archiveReviveNeedUsers;
  },
  cardDisplayClass() {
    const userId = Meteor.user()._id;
    if (_.contains(this.invest, userId)) {
      return 'company-card-holder';
    }
    else {
      return 'company-card-default';
    }
  }
};
const companyArchiveListEvents = {
  'click [data-expand-order]'(event, templateInstance) {
    event.preventDefault();
    const panel = templateInstance.$('.order-panel');
    const maxHeight = panel.css('max-height');
    if (maxHeight === '0px') {
      panel.css('max-height', panel.prop('scrollHeight'));
    }
    else {
      panel.css('max-height', 0);
    }
  },
  'click [data-action="invest"]'(event, templaceInstance) {
    event.preventDefault();
    investArchiveCompany(templaceInstance.data);
  }
};
Template.companyArchiveListCard.helpers(companyArchiveListHelpers);
Template.companyArchiveListCard.events(companyArchiveListEvents);
Template.companyArchiveListTable.helpers(companyArchiveListHelpers);
Template.companyArchiveListTable.events(companyArchiveListEvents);
