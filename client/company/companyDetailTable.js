import { Template } from 'meteor/templating';

import { paramCompany } from './helpers';

Template.companyDetailTable.helpers({
  company() {
    return paramCompany();
  }
});
