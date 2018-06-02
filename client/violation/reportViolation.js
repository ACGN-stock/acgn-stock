import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { roleDisplayName } from '/db/users';
import { canReportViolation } from './helpers';

Template.reportViolation.helpers({
  canReportViolation,
  roleDisplayName,
  formArgs() {
    const violatorType = FlowRouter.getQueryParam('type');
    const violatorId = FlowRouter.getQueryParam('id');

    return { violator: { violatorType, violatorId } };
  }
});
