import { Template } from 'meteor/templating';

import { changeCompanyName, sealCompany, sendFscNotice } from '/client/utils/methods';
import { paramCompany, paramCompanyId } from './helpers';

Template.companyDetailAdminPanel.helpers({
  company() {
    return paramCompany();
  }
});

Template.companyDetailAdminPanel.events({
  'click [data-action="changeCompanyName"]'(event) {
    event.preventDefault();
    changeCompanyName(paramCompany());
  },
  'click [data-action="seal"]'(event) {
    event.preventDefault();
    sealCompany(paramCompany());
  },
  'click [data-action="sendFscNotice"]'(event) {
    event.preventDefault();
    const companyId = paramCompanyId();
    const { manager } = paramCompany();

    sendFscNotice({ userIds: [manager], companyId });
  }
});
