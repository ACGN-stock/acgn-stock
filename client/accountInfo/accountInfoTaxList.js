import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbTaxes } from '/db/dbTaxes';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { currencyFormat } from '../utils/helpers';
import { accountInfoCommonHelpers, paramUserId, paramUser } from './helpers';

inheritedShowLoadingOnSubscribing(Template.accountInfoTaxList);

Template.accountInfoTaxList.onCreated(function() {
  this.taxListOffset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const userId = paramUserId();

    if (userId) {
      const offset = this.taxListOffset.get();
      this.subscribe('accountInfoTax', userId, offset);
    }
  });
});
Template.accountInfoTaxList.helpers({
  ...accountInfoCommonHelpers,
  taxesList() {
    const userId = paramUserId();

    return dbTaxes.find({ userId }, {
      limit: 10,
      sort: {
        expireDate: 1
      }
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountInfoTax',
      dataNumberPerPage: 10,
      offset: Template.instance().taxListOffset
    };
  }
});
Template.accountInfoTaxList.events({
  'click [data-pay]'(event) {
    const taxId = new Mongo.ObjectID($(event.currentTarget).attr('data-pay'));
    const taxData = dbTaxes.findOne(taxId);
    if (taxData) {
      const user = paramUser();
      const totalNeedPay = taxData.stockTax + taxData.moneyTax + taxData.zombieTax + taxData.fine - taxData.paid;
      const maxPayMoney = Math.min(user.profile.money, totalNeedPay);
      if (maxPayMoney < 1) {
        alertDialog.alert('您的金錢不足以繳納稅金！');
      }
      alertDialog.dialog({
        type: 'prompt',
        title: '繳納稅金',
        message: `請輸入您要繳納的金額：(1~${currencyFormat(maxPayMoney)})`,
        inputType: 'number',
        defaultValue: maxPayMoney,
        customSetting: `min="1" max="${maxPayMoney}"`,
        callback: (amount) => {
          amount = parseInt(amount, 10);
          if (amount) {
            Meteor.customCall('payTax', taxId, amount);
          }
        }
      });
    }
  }
});
