import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { dbEmployees } from '/db/dbEmployees';
import { inheritedShowLoadingOnSubscribing } from '/client/layout/loading';
import { paramCompanyId } from '/client/company/helpers';
import { alertDialog } from '/client/layout/alertDialog';

inheritedShowLoadingOnSubscribing(Template.companyEmployeeList);

Template.companyEmployeeList.helpers({
  employeeList() {
    const companyId = paramCompanyId();
    const employed = true;

    return dbEmployees.find({ companyId, employed }, { sort: { registerAt: 1 } });
  },
  nextSeasonEmployeeList() {
    const companyId = paramCompanyId();
    const employed = false;

    return dbEmployees.find({ companyId, employed }, { sort: { registerAt: 1 } });
  },
  isCurrentUserEmployed() {
    const userId = Meteor.userId();
    const companyId = paramCompanyId();

    if (! userId) {
      return false;
    }

    return dbEmployees.find({ companyId, userId, employed: true }).count() > 0;
  },
  showMessage(message) {
    return message || '無';
  },
  getMyMessage() {
    const userId = Meteor.userId();
    const companyId = paramCompanyId();

    const employeeData = dbEmployees.findOne({ companyId, userId, employed: true });
    if (! employeeData) {
      return '';
    }

    return employeeData.message;
  }
});

Template.companyEmployeeList.events({
  'submit form'(event, templateInstance) {
    event.preventDefault();
    const message = templateInstance.$('[name="message"]').val();
    if (message.length > 100) {
      alertDialog.alert('輸入訊息過長！');
    }
    else if (Meteor.user() && message.length) {
      Meteor.customCall('setEmployeeMessage', paramCompanyId(), message);
    }
  }
});
