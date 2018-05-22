import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { categoryDisplayName, categoryMap, dbViolationCases } from '/db/dbViolationCases';
import { inheritUtilForm } from '../utils/form';
import { alertDialog } from '../layout/alertDialog';

Template.violatorDisplay.helpers({
  isViolatorType(type) {
    return Template.currentData().violatorType === type;
  }
});
