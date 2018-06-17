import { Template } from 'meteor/templating';

import { sealCompany, toggleFavorite } from '/client/utils/methods';
import { paramCompany } from './helpers';

Template.companyDetailSealedContent.events({
  'click [data-action="unseal"]'(event) {
    event.preventDefault();
    sealCompany(paramCompany());
  },
  'click [data-toggle-favorite]'(event, templateInstance) {
    event.preventDefault();
    const companyId = templateInstance.$(event.currentTarget).attr('data-toggle-favorite');
    toggleFavorite(companyId);
  }
});

Template.companyDetailSealedContent.helpers({
  company() {
    return paramCompany();
  }
});
