import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';

import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { paramCompany, paramCompanyId } from './helpers';

inheritedShowLoadingOnSubscribing(Template.companyDetail);

Template.companyDetail.onCreated(function() {
  this.autorun(() => {
    const company = paramCompany();
    if (company) {
      DocHead.setTitle(`${Meteor.settings.public.websiteInfo.websiteName} - 「${company.companyName}」公司資訊`);
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
