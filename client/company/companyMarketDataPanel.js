import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';

import { paramCompany, paramCompanyId } from './helpers';

Template.companyMarketDataPanel.onCreated(function() {
  this.tradeVolume24h = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const companyId = paramCompanyId();
    if (companyId) {
      Meteor.customCall('queryTodayDealAmount', companyId, (error, result) => {
        if (! error) {
          this.tradeVolume24h.set(result);
        }
      });
    }
  });
});

Template.companyMarketDataPanel.helpers({
  company() {
    return paramCompany();
  },
  tradeVolume24h() {
    return Template.instance().tradeVolume24h.get();
  },
  priceDisplayClass(lastPrice, listPrice) {
    if (lastPrice > listPrice) {
      return 'text-danger';
    }
    else if (listPrice > lastPrice) {
      return 'text-success';
    }
  }
});
