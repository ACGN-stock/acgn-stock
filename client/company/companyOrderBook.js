import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { createBuyOrder, createSellOrder } from '/client/utils/methods';
import { inheritedShowLoadingOnSubscribing } from '/client/layout/loading';
import { wrapScopeKey } from '/common/imports/utils/wrapScopeKey';
import { dbOrders, orderTypeTranslateMap } from '/db/dbOrders';
import { getCurrentUserOwnedStockAmount, paramCompany, paramCompanyId } from './helpers';

inheritedShowLoadingOnSubscribing(Template.companyOrderBook);

Template.companyOrderBook.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    if (Meteor.user()) {
      this.subscribe('currentUserOrders');
      this.subscribe('currentUserDirectors');
    }
  });

  this.getCurrentUserOrders = (type) => {
    return dbOrders.find({
      companyId: paramCompanyId(),
      orderType: orderTypeTranslateMap[type],
      [wrapScopeKey('currentUser')]: 1
    });
  };
  // rBuyOrderOffset.set(0);
  // rSellOrderOffset.set(0);
  // this.autorunWithIdleSupport(() => {
  //   const companyId = paramCompanyId();
  //   if (companyId) {
  //     this.subscribe('companyOrders', companyId, '購入', rBuyOrderOffset.get());
  //     this.subscribe('companyOrders', companyId, '賣出', rSellOrderOffset.get());
  //   }
  // });
});

Template.companyOrderBook.helpers({
  company() {
    return paramCompany();
  },
  currentUserOrders(type) {
    return Template.instance().getCurrentUserOrders(type);
  },
  hasCurrentUserOrders(type) {
    return Template.instance().getCurrentUserOrders(type).count() > 0;
  },
  canSellStocks() {
    return !! getCurrentUserOwnedStockAmount(paramCompanyId());
  }
});

Template.companyOrderBook.events({
  'click [data-action="createBuyOrder"]'(event) {
    event.preventDefault();
    createBuyOrder(Meteor.user(), paramCompany());
  },
  'click [data-action="createSellOrder"]'(event) {
    event.preventDefault();
    createSellOrder(Meteor.user(), paramCompany());
  }
});

// Template.companySellOrderList.helpers({
//   getCurrentUserOwnedStockAmount() {
//     return getCurrentUserOwnedStockAmount(this._id);
//   },
//   myOrderList() {
//     const companyId = this._id;
//     const user = Meteor.user();
//     if (user) {
//       const userId = user._id;
//
//       return dbOrders.find({
//         companyId: companyId,
//         orderType: '賣出',
//         userId: userId
//       }, {
//         sort: { unitPrice: 1, createdAt: 1 },
//         limit: rSellOrderOffset.get() + 10
//       });
//     }
//   },
//   orderList() {
//     const companyId = this._id;
//     const filter = {
//       companyId: companyId,
//       orderType:  '賣出'
//     };
//     const user = Meteor.user();
//     if (user) {
//       filter.userId = { $ne: user._id };
//     }
//
//     return dbOrders.find(filter, {
//       sort: { unitPrice: 1, createdAt: 1 },
//       limit: 10
//     });
//   },
//   paginationData() {
//     return {
//       useVariableForTotalCount: 'totalCountOfCompanyOrder賣出',
//       dataNumberPerPage: 10,
//       offset: rSellOrderOffset
//     };
//   }
// });
//
// Template.companySellOrderList.events({
//   'click [data-action="createSellOrder"]'(event, templateInstance) {
//     event.preventDefault();
//     createSellOrder(Meteor.user(), templateInstance.data);
//   },
//   'click [data-cancel-order]'(event) {
//     event.preventDefault();
//     const orderId = $(event.currentTarget).attr('data-cancel-order');
//     const orderData = dbOrders.findOne(orderId);
//     retrieveOrder(orderData);
//   }
// });
