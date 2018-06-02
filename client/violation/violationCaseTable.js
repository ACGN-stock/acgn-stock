import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { wrapScopeKey } from '/common/imports/utils/wrapScopeKey';
import { dbViolationCases, categoryMap, stateMap } from '/db/dbViolationCases';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { commonHelpers } from './helpers';

const validListTypes = ['userViolated', 'companyViolated', 'userReported'];

const counterNameMap = {
  userViolated: 'userViolationCases',
  companyViolated: 'companyViolationCases',
  userReported: 'userReportedViolationCases'
};

inheritedShowLoadingOnSubscribing(Template.violationCaseTable);

Template.violationCaseTable.helpers({
  ...commonHelpers,
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
  violationCases() {
    const { listType } = Template.currentData();

    return dbViolationCases.find({ [wrapScopeKey(listType)]: 1 }, { sort: { createdAt: -1 } });
  },
  paginationData() {
    const { listType } = Template.currentData();
    const counterName = counterNameMap[listType];

    return {
      counterName,
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage[counterName],
      offset: Template.instance().offset
    };
  }
});

Template.violationCaseTable.onCreated(function() {
  this.category = new ReactiveVar();
  this.state = new ReactiveVar();
  this.offset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const { listType, userId, companyId } = Template.currentData();

    if (! listType || ! validListTypes.includes(listType)) {
      return;
    }

    if ((listType === 'userViolated' || listType === 'userReported') && ! userId) {
      return;
    }

    if (listType === 'companyViolated' && ! companyId) {
      return;
    }

    const category = this.category.get();
    const state = this.state.get();
    const offset = this.offset.get();

    this.subscribe('violationCaseListSimple', { listType, userId, companyId, category, state, offset });
  });
});

Template.violationCaseTable.events({
  'change select[name="category"]': _.debounce(function(event, templateInstance) {
    event.preventDefault();
    templateInstance.category.set(templateInstance.$(event.currentTarget).val() || undefined);
  }, 250),
  'change select[name="state"]': _.debounce(function(event, templateInstance) {
    event.preventDefault();
    templateInstance.state.set(templateInstance.$(event.currentTarget).val() || undefined);
  }, 250)
});
