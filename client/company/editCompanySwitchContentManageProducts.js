import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { getTotalProductionFund, getUsedProductionFund, getPlanningProducts } from '/db/dbCompanies';
import { dbProducts, productTypeList } from '/db/dbProducts';
import { alertDialog } from '../layout/alertDialog';
import { sanitizeHtml } from '../utils/helpers';
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
        message: `確定要刪除「${sanitizeHtml(productData.productName)}」這項待上架產品嗎？`,
        callback: (result) => {
          if (result) {
            Meteor.customCall('removeProduct', productId);
          }
        }
      });
    }
  }
});
