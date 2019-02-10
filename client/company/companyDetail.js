import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';

import { getCurrentPageFullTitle } from '/routes';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { paramCompany, paramCompanyId } from './helpers';

inheritedShowLoadingOnSubscribing(Template.companyDetail);

Template.companyDetail.onCreated(function() {
  this.autorun(() => {
    const company = paramCompany();
    if (company) {
      DocHead.setTitle(getCurrentPageFullTitle(company.companyName));
    }
  });

  this.autorunWithIdleSupport(() => {
    const companyId = paramCompanyId();
    if (companyId) {
      this.subscribe('companyDetail', companyId);
    }
  });
});

Template.companyDetail.helpers({
  company() {
    return paramCompany();
  }
});
