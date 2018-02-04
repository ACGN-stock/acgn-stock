import SimpleSchema from 'simpl-schema';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { getAvailableProductionFund } from '/db/dbCompanies';
import { dbProducts, productTypeList } from '/db/dbProducts';
import { inheritUtilForm, handleInputChange as baseHandleInputChange } from '../utils/form';
import { paramCompany } from './helpers';

Template.companyProductEditForm.events({
  reset(event, templateInstance) {
    templateInstance.data.onReset();
  }
});

inheritUtilForm(Template.companyProductEditFormInner);

Template.companyProductEditFormInner.onCreated(function() {
  this.requiredProductionFund = new ReactiveVar(0);
  const parentData = Template.parentData();

  this.validateModel = (model) => {
    const error = {};

    const schema = dbProducts.simpleSchema().pick('companyId', 'productName', 'type', 'url', 'description', 'price', 'totalAmount');
    const cleanedModel = schema.clean(model);

    if (! cleanedModel.productName) {
      error.productName = '缺少產品名稱！';
    }
    else if (cleanedModel.productName.length < 4) {
      error.productName = '產品名稱字數過短，至少需要 4 個字！';
    }
    else if (cleanedModel.productName.length > 255) {
      error.productName = '產品名稱字數過長，最多不超過 255 字！';
    }

    if (! SimpleSchema.RegEx.Url.test(cleanedModel.url)) {
      error.url = '連結格式錯誤！';
    }

    if (cleanedModel.description && cleanedModel.description.length > 500) {
      error.productName = '產品描述字數過長，最多不超過 500 字！';
    }

    if (! cleanedModel.price) {
      error.price = '缺少產品價格！';
    }
    else if (cleanedModel.price > parentData.company.productPriceLimit) {
      error.price = '產品售價超過上限！';
    }

    if (! cleanedModel.totalAmount) {
      error.totalAmount = '缺少產品數量！';
    }

    const availableProductionFund = getAvailableProductionFund(paramCompany());
    const requiredProductionFund = cleanedModel.price * cleanedModel.totalAmount;
    if (requiredProductionFund && availableProductionFund < requiredProductionFund) {
      error.totalAmount = '生產資金不足！';
    }

    if (_.size(error) > 0) {
      return error;
    }
  };

  this.saveModel = (model) => {
    const schema = dbProducts.simpleSchema().pick('companyId', 'productName', 'type', 'url', 'description', 'price', 'totalAmount');
    const cleanedModel = schema.clean(model);
    Meteor.customCall('createProduct', cleanedModel, (error) => {
      if (! error) {
        parentData.onSave();
      }
    });
  };

  this.handleInputChange = (...args) => {
    baseHandleInputChange.call(this, ...args);
    const { totalAmount, price } = this.model.get();
    this.requiredProductionFund.set(parseInt(totalAmount || 0, 10) * parseInt(price || 0, 10));
  };
});

Template.companyProductEditFormInner.helpers({
  productTypeList() {
    return productTypeList;
  },
  requiredProductionFund() {
    return Template.instance().requiredProductionFund.get();
  }
});
