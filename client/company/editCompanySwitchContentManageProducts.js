import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { getTotalProductionFund, getUsedProductionFund, getPlanningProducts } from '/db/dbCompanies';
import { dbProducts, productTypeList, productRatingList } from '/db/dbProducts';
import { alertDialog } from '../layout/alertDialog';
import { paramCompany, paramCompanyId } from './helpers';

Template.editCompanySwitchContentManageProducts.onCreated(function() {
  this.rInAddProductMode = new ReactiveVar(false);
});

Template.editCompanySwitchContentManageProducts.helpers({
  inAddMode() {
    return Template.instance().rInAddProductMode.get();
  },
  formArgs() {
    const templateInstance = Template.instance();

    return {
      company: paramCompany(),
      product: {
        productName: '',
        companyId: paramCompanyId(),
        type: productTypeList[0],
        rating: productRatingList[0],
        url: ''
      },
      onReset() {
        templateInstance.rInAddProductMode.set(false);
      },
      onSave() {
        templateInstance.rInAddProductMode.set(false);
      }
    };
  },
  productList() {
    return getPlanningProducts(paramCompany(), { sort: { createdAt: 1 } });
  },
  usedProductionFund() {
    return getUsedProductionFund(paramCompany());
  },
  availableProductionFund() {
    return getTotalProductionFund(paramCompany()) - getUsedProductionFund(paramCompany());
  },
  isUntyped(type) {
    return type === '未分類';
  }
});

Template.editCompanySwitchContentManageProducts.events({
  'click [data-action="addProduct"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.rInAddProductMode.set(true);
  },
  'click [data-remove-product]'(event) {
    const productId = $(event.currentTarget).attr('data-remove-product');
    const productData = dbProducts.findOne(productId);
    if (productData) {
      alertDialog.confirm({
        message: `確定要刪除「${_.escape(productData.productName)}」這項待上架產品嗎？`,
        callback: (result) => {
          if (result) {
            Meteor.customCall('removeProduct', productId);
          }
        }
      });
    }
  }
});
