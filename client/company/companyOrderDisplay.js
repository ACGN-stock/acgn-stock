import { Template } from 'meteor/templating';

import { retrieveOrder } from '/client/utils/methods';
import { dbOrders } from '/db/dbOrders';

Template.companyOrderDisplay.helpers({
  orderTypeDisplayName() {
    return Template.currentData().orderType;
  },
  unfilledAmount() {
    const { amount: totalAmount, done: filledAmount } = Template.currentData();

    return totalAmount - filledAmount;
  }
});

Template.companyOrderDisplay.events({
  'click [data-action="cancelOrder"]'(event, templateInstance) {
    event.preventDefault();
    const orderId = templateInstance.$(event.currentTarget).attr('data-order-id');
    retrieveOrder(dbOrders.findOne(orderId));
  }
});
