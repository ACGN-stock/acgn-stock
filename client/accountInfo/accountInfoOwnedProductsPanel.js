import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbUserOwnedProducts } from '/db/dbUserOwnedProducts';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { accountInfoCommonHelpers } from './helpers';

inheritedShowLoadingOnSubscribing(Template.accountInfoOwnedProductsPanel);

Template.accountInfoOwnedProductsPanel.onCreated(function() {
  this.ownedProductsOffset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const userId = FlowRouter.getParam('userId');

    if (userId) {
      const offset = this.ownedProductsOffset.get();
      this.subscribe('userOwnedProducts', { userId, offset });
    }
  });
});

Template.accountInfoOwnedProductsPanel.helpers({
  ...accountInfoCommonHelpers,
  ownedProducts() {
    const { user: { _id: userId } } = Template.instance().data;

    return dbUserOwnedProducts.find({ userId });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfUserOwnedProducts',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.userOwnedProducts,
      offset: Template.instance().ownedProductsOffset
    };
  }
});
