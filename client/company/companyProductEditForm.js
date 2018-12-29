import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { getAvailableProductionFund } from '/db/dbCompanies';
import {
  dbProducts, productTypeList, productRatingList, productReplenishBaseAmountTypeList,
  productReplenishBatchSizeTypeList, productReplenishBatchSizeTypeDisplayName, productReplenishBaseAmountTypeDisplayName
} from '/db/dbProducts';
import { inheritUtilForm, handleInputChange as baseHandleInputChange } from '../utils/form';
import { paramCompany } from './helpers';

Template.companyProductEditForm.events({
  reset(event, templateInstance) {
    templateInstance.data.onReset();
  }
});

inheritUtilForm(Template.companyProductEditFormInner);

const formModelSchema = dbProducts.simpleSchema().pick(
  'productName', 'type', 'rating', 'url', 'description',
  'price', 'totalAmount', 'replenishBatchSizeType', 'replenishBaseAmountType'
);

Template.companyProductEditFormInner.onCreated(function() {
  this.requiredProductionFund = new ReactiveVar(0);
  const parentData = Template.parentData();
  const isNewProduct = ! parentData.product._id;
  const oldRequiredProductionFund = (parentData.product.price || 0) * (parentData.product.totalAmount || 0);


  this.validateModel = (model) => {
    const error = {};

    const cleanedModel = formModelSchema.clean(model);

    try {
      formModelSchema.validate(cleanedModel);
    }
    catch (e) {
      if (e.error === 'validation-error') {
        e.details.forEach(({ name, message }) => {
          error[name] = message;
        });
      }
      else throw e;
    }

    if (cleanedModel.price > parentData.company.productPriceLimit) {
      error.price = '產品售價超過上限！';
    }

    const availableProductionFund = getAvailableProductionFund(paramCompany());
    const requiredProductionFund = cleanedModel.price * cleanedModel.totalAmount - oldRequiredProductionFund;
    if (requiredProductionFund && availableProductionFund < requiredProductionFund) {
      error.productionFund = '生產資金不足！';
    }

    if (_.size(error) > 0) {
      return error;
    }
  };

  this.saveModel = (model) => {
    const cleanedModel = formModelSchema.clean(model);

    const methodName = isNewProduct ? 'createProduct' : 'editProduct';
    const newProductMethodArgs = { companyId: model.companyId, data: cleanedModel };
    const editProductMethodsArgs = { productId: parentData.product._id, newData: cleanedModel };
    const methodArgs = [isNewProduct ? newProductMethodArgs : editProductMethodsArgs];

    Meteor.customCall(methodName, ...methodArgs, (error) => {
      if (! error) {
        parentData.onSave();
      }
    });
  };

  this.handleInputChange = (...args) => {
    baseHandleInputChange.call(this, ...args);
    const { totalAmount, price } = this.model.get();
    this.requiredProductionFund.set(parseInt(totalAmount || 0, 10) * parseInt(price || 0, 10) - oldRequiredProductionFund);
  };
});

Template.companyProductEditFormInner.helpers({
  productReplenishBaseAmountTypeDisplayName,
  productReplenishBatchSizeTypeDisplayName,
  productTypeList() {
    return productTypeList;
  },
  productRatingList() {
    return productRatingList;
  },
  productReplenishBaseAmountTypeList() {
    return productReplenishBaseAmountTypeList;
  },
  productReplenishBatchSizeTypeList() {
    return productReplenishBatchSizeTypeList;
  },
  requiredProductionFund() {
    return Template.instance().requiredProductionFund.get();
  },
  selectedAttr(expected, actual) {
    return expected === actual ? 'selected' : '';
  }
});
