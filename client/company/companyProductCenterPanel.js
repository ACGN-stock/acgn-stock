import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbCompanies } from '/db/dbCompanies';
import { dbProducts } from '/db/dbProducts';
import { getAvailableProductTradeQuota, getSpentProductTradeQuota } from '/db/dbUserOwnedProducts';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';

inheritedShowLoadingOnSubscribing(Template.companyProductCenterPanel);

Template.companyProductCenterPanel.onCreated(function() {
  const companyId = FlowRouter.getParam('companyId');

  this.companyMarketingProductsOffset = new ReactiveVar(0);

  this.getCompany = () => {
    return dbCompanies.findOne(companyId);
  };

  this.getMarketingProducts = () => {
    return dbProducts.find({ companyId, state: 'marketing' });
  };

  this.autorunWithIdleSupport(() => {
    this.subscribe('companyProductCenterInfo', companyId);
  });

  this.autorunWithIdleSupport(() => {
    const offset = this.companyMarketingProductsOffset.get();
    this.subscribe('companyMarketingProducts', { companyId, offset });
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
  currentUserSpentTradeQuota() {
    const templateInstance = Template.instance();
    const { _id: companyId } = templateInstance.getCompany();

    return getSpentProductTradeQuota({
      userId: Meteor.userId(),
      companyId
    });
  },
  currentUserAvailableTradeQuota() {
    const templateInstance = Template.instance();
    const { _id: companyId } = templateInstance.getCompany();

    return getAvailableProductTradeQuota({
      userId: Meteor.userId(),
      companyId
    });
  },
  marketingProducts() {
    return Template.instance().getMarketingProducts();
  },
  hasPlanningProducts() {
    const { productCenterInfo } = Template.instance().getCompany();

    if (! productCenterInfo) {
      return false;
    }

    return productCenterInfo.planningProductCount > 0;
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfCompanyMarketingProducts',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.companyMarketingProducts,
      offset: Template.instance().companyMarketingProductsOffset
    };
  }
});
