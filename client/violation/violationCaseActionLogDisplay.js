import { Template } from 'meteor/templating';

import { pathForViolationCaseDetail } from './helpers';

Template.violationCaseActionLogDisplay.helpers({
  pathForViolationCaseDetail,
  isAction(action) {
    return Template.currentData().action === action;
  },
  stateTransitionActionText(state) {
    switch (state) {
      case 'accepted':
        return '受理了本案件';
      case 'rejected':
        return '駁回了本案件';
      case 'closed':
        return '結束了本案件';
      default:
        return state;
    }
  }
});
