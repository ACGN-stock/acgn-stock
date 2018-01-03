import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { getAvailableProductTradeQuota } from '/db/dbUserOwnedProducts';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';

inheritedShowLoadingOnSubscribing(Template.companyProductCenterPanel);

Template.companyProductCenterPanel.onCreated(function() {
  const companyId = FlowRouter.getParam('companyId');

  this.getCompany = () => {
    return dbCompanies.findOne(companyId);
  };

  this.getMarketingProducts = () => {
    return dbProducts.find({ companyId, state: 'marketing' });
  };

  this.autorunWithIdleSupport(() => {
    this.subscribe('companyProductCenterInfo', companyId);
    this.subscribe('companyMarketingProducts', companyId);
  });

  this.autorunWithIdleSupport(() => {
    if (Meteor.userId()) {
      this.subscribe('currentUserVoteRecord', companyId);
      this.subscribe('companyCurrentUserOwnedProducts', companyId);
    }
  });
});

Template.companyProductCenterPanel.helpers({
  company() {
    return Template.instance().getCompany();
  },
  currentUserTradeQuota() {
    const templateInstance = Template.instance();
    const { _id: companyId } = templateInstance.getCompany();

    return getAvailableProductTradeQuota({
      userId: Meteor.userId(),
      companyId
    });
  },
  marketingProducts() {
    return Template.instance().getMarketingProducts();
  }
});
