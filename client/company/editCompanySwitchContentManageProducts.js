import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { getTotalProductionFund, getUsedProductionFund, getPlanningProducts } from '/db/dbCompanies';
import {
  dbProducts, productTypeList, productRatingList,
  productReplenishBaseAmountTypeDisplayName, productReplenishBatchSizeTypeDisplayName,
  productReplenishBatchSizeTypeList, productReplenishBaseAmountTypeList
} from '/db/dbProducts';
import { alertDialog } from '../layout/alertDialog';
import { paramCompany, paramCompanyId } from './helpers';

Template.editCompanySwitchContentManageProducts.onCreated(function() {
  this.productEditFormVisible = new ReactiveVar(false);
  this.editingProductId = new ReactiveVar(null);
});

Template.editCompanySwitchContentManageProducts.helpers({
  productReplenishBatchSizeTypeDisplayName,
  productReplenishBaseAmountTypeDisplayName,
  isFormVisible() {
    return Template.instance().productEditFormVisible.get();
  },
  disabledOnFormVisibleClass() {
    return Template.instance().productEditFormVisible.get() ? 'disabled' : '';
  },
  formArgs() {
    const templateInstance = Template.instance();

    const emptyProductData = {
      companyId: paramCompanyId(),
      type: productTypeList[0],
      rating: productRatingList[0],
      replenishBaseAmountType: productReplenishBaseAmountTypeList[0],
      replenishBatchSizeType: productReplenishBatchSizeTypeList[0]
    };

    const productId = templateInstance.editingProductId.get();
    const productData = dbProducts.findOne(productId);

    return {
      company: paramCompany(),
      product: productId ? productData : emptyProductData,
      onReset() {
        templateInstance.productEditFormVisible.set(false);
        templateInstance.editingProductId.set(null);
      },
      onSave() {
        templateInstance.productEditFormVisible.set(false);
        templateInstance.editingProductId.set(null);
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
  },
  isEditingProduct(productId) {
    return Template.instance().editingProductId.get() === productId;
  }
});

Template.editCompanySwitchContentManageProducts.events({
  'click [data-action="addProduct"]'(event, templateInstance) {
    event.preventDefault();

    if (templateInstance.productEditFormVisible.get()) {
      return;
    }

    templateInstance.productEditFormVisible.set(true);
  },
  'click [data-action="editProduct"]'(event, templateInstance) {
    event.preventDefault();

    if (templateInstance.productEditFormVisible.get()) {
      return;
    }

    const productId = $(event.currentTarget).attr('data-product-id');
    const productData = dbProducts.findOne(productId);

    if (! productData) {
      return;
    }

    templateInstance.editingProductId.set(productId);
    templateInstance.productEditFormVisible.set(true);
  },
  'click [data-action="removeProduct"]'(event) {
    event.preventDefault();

    const productId = $(event.currentTarget).attr('data-product-id');
    const productData = dbProducts.findOne(productId);

    if (! productData) {
      return;
    }

    alertDialog.confirm({
      message: `確定要刪除「${_.escape(productData.productName)}」這項待上架產品嗎？`,
      callback: (result) => {
        if (result) {
          Meteor.customCall('removeProduct', productId);
        }
      }
    });
  }
});
