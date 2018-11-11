import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { inheritedShowLoadingOnSubscribing } from '/client/layout/loading';
import { paramCompanyId } from '/client/company/helpers';
import { dbLog } from '/db/dbLog';

const rIsOnlyShowMine = new ReactiveVar(false);
const rLogOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.companyLogList);
Template.companyLogList.onCreated(function() {
  rLogOffset.set(0);
  this.autorunWithIdleSupport(() => {
    const companyId = paramCompanyId();
    if (companyId) {
      this.subscribe('companyLog', companyId, rIsOnlyShowMine.get(), rLogOffset.get());
    }
  });
});
Template.companyLogList.helpers({
  onlyShowMine() {
    return rIsOnlyShowMine.get();
  },
  logList() {
    const companyId = paramCompanyId();

    return dbLog.find({ companyId }, {
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
Template.companyLogList.events({
  'click [data-action="toggleOnlyShowMine"]'(event) {
    event.preventDefault();
    rIsOnlyShowMine.set(! rIsOnlyShowMine.get());
  }
});
