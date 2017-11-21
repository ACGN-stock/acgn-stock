'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbLog } from '/db/dbLog';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { shouldStopSubscribe } from '../utils/idle';
import { investArchiveCompany } from '../utils/methods';
const rShowAllTags = new ReactiveVar(false);

inheritedShowLoadingOnSubscribing(Template.companyArchiveDetail);
Template.companyArchiveDetail.onCreated(function() {
  rShowAllTags.set(false);
  this.autorun(() => {
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      const companyArchiveData = dbCompanyArchive.findOne(companyId);
      if (companyArchiveData) {
        DocHead.setTitle(Meteor.settings.public.websiteName + ' - 「' + companyArchiveData.name + '」保管庫公司資訊');
      }
    }
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyArchiveDetail', companyId);
    }
  });
});
Template.companyArchiveDetail.helpers({
  companyArchiveData() {
    const companyId = FlowRouter.getParam('companyId');

    return dbCompanyArchive.findOne(companyId);
  },
  showAllTags(tags) {
    if (tags.length <= 4) {
      return true;
    }

    return rShowAllTags.get();
  },
  firstFewTags(tags) {
    return tags.slice(0, 3);
  }
});
Template.companyArchiveDetail.events({
  'click [data-action="invest"]'(event) {
    event.preventDefault();
    investArchiveCompany(this);
  },
  'click [data-action="showAllTags"]'(event) {
    event.preventDefault();
    rShowAllTags.set(true);
  }
});

//是否展開面板
const rDisplayPanelList = new ReactiveVar([]);
Template.companyArchiveDetailTable.helpers({
  isDisplayPanel(panelType) {
    return _.contains(rDisplayPanelList.get(), panelType);
  },
  archiveReviveNeedUsers() {
    return Meteor.settings.public.archiveReviveNeedUsers;
  }
});
Template.companyArchiveDetailTable.events({
  'click [data-toggle-panel]'(event) {
    event.preventDefault();
    const $emitter = $(event.currentTarget);
    const panelType = $emitter.attr('data-toggle-panel');
    const displayPanelList = rDisplayPanelList.get();
    if (_.contains(displayPanelList, panelType)) {
      rDisplayPanelList.set(_.without(displayPanelList, panelType));
    }
    else {
      displayPanelList.push(panelType);
      rDisplayPanelList.set(displayPanelList);
    }
  }
});

const rLogOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.companyArchiveLogList);
Template.companyArchiveLogList.onCreated(function() {
  rLogOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyLog', companyId, false, rLogOffset.get());
    }
  });
});
Template.companyArchiveLogList.helpers({
  logList() {
    const companyId = FlowRouter.getParam('companyId');

    return dbLog.find({companyId}, {
      sort: {
        createdAt: -1
      },
      limit: 30
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfcompanyLog',
      dataNumberPerPage: 30,
      offset: rLogOffset
    };
  }
});
