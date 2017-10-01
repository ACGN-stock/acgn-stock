'use strict';
import SimpleSchema from 'simpl-schema';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';
import { inheritUtilForm, handleInputChange as inheritedHandleInputChange } from '../utils/form';
import { dbCompanies } from '../../db/dbCompanies';
import { dbProducts, productTypeList } from '../../db/dbProducts';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';

inheritedShowLoadingOnSubscribing(Template.editCompany);
Template.editCompany.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyDataForEdit', companyId);
    }
  });
});
Template.editCompany.helpers({
  companyData() {
    const companyId = FlowRouter.getParam('companyId');

    return dbCompanies.findOne(companyId);
  }
});

inheritUtilForm(Template.companyEditForm);
Template.companyEditForm.onCreated(function() {
  this.validateModel = validateCompanyModel;
  this.handleInputChange = handleCompanyInputChange;
  this.saveModel = saveCompanyModel;
  this.autorun(() => {
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId);
    this.model.set(companyData);
  });
});
function validateCompanyModel(model) {
  const error = {};
  if (model.tags.length > 50) {
    error.tags = '標籤數量過多！';
  }
  else {
    _.each(model.tags, (tag) => {
      if (tag.length > 50) {
        error.tags = '單一標籤不可超過50個字！';
      }
    });
  }
  if (model.pictureSmall) {
    if (! SimpleSchema.RegEx.Url.test(model.pictureSmall)) {
      error.pictureSmall = '連結格式錯誤！';
    }
  }
  if (model.pictureBig) {
    if (! SimpleSchema.RegEx.Url.test(model.pictureBig)) {
      error.pictureBig = '連結格式錯誤！';
    }
  }
  if (model.description.length < 10) {
    error.description = '介紹文字過少！';
  }
  else if (model.description.length > 3000) {
    error.description = '介紹文字過多！';
  }

  if (_.size(error) > 0) {
    return error;
  }
}
function handleCompanyInputChange(event) {
  switch (event.currentTarget.name) {
    case 'tags': {
      break;
    }
    default: {
      inheritedHandleInputChange.call(this, event);
      break;
    }
  }
}
function saveCompanyModel(model) {
  const companyId = model._id;
  const submitData = _.pick(model, 'tags', 'pictureSmall', 'pictureBig', 'description');
  Meteor.customCall('editCompany', companyId, submitData, (error) => {
    if (! error) {
      const path = FlowRouter.path('companyDetail', {companyId});
      FlowRouter.go(path);
    }
  });
}

const previewPictureType = new ReactiveVar('');
Template.companyEditForm.helpers({
  isPreview(pictureType) {
    return previewPictureType.get() === pictureType;
  },
  getCompanyHref(companyId) {
    return FlowRouter.path('companyDetail', {companyId});
  }
});

Template.companyEditForm.events({
  'click [data-remove-tag]'(event, templatInstance) {
    const tag = $(event.currentTarget).attr('data-remove-tag');
    const model = _.clone(templatInstance.model.get());
    model.tags = _.without(model.tags, tag);
    templatInstance.model.set(model);
  },
  'keypress [name="tags"]'(event, templatInstance) {
    if (event.which === 13) {
      event.preventDefault();
      event.stopPropagation();
      addNewTag(event, templatInstance);
    }
  },
  'click [data-action="addNewTag"]': addNewTag,
  'click [data-preview]'(event) {
    const type = $(event.currentTarget).attr('data-preview');
    if (type === previewPictureType.get()) {
      previewPictureType.set('');
    }
    else {
      previewPictureType.set(type);
    }
  }
});
function addNewTag(event, templatInstance) {
  const $input = templatInstance.$input.filter('[name="tags"]');
  const model = _.clone(templatInstance.model.get());
  const tag = $input.val().trim();
  if (! tag) {
    alertDialog.alert('請輸入標籤名稱！');

    return false;
  }
  model.tags.push(tag);
  model.tags = _.unique(model.tags);
  templatInstance.model.set(model);
  $input.val('');
}

const rInAddProductMode = new ReactiveVar(false);
Template.companyProductManage.onCreated(function() {
  rInAddProductMode.set(false);
});
Template.companyProductManage.helpers({
  inAddMode() {
    return rInAddProductMode.get();
  },
  defaultProductData() {
    return {
      productName: '',
      companyId: this._id,
      type: productTypeList[0],
      url: ''
    };
  },
  productList() {
    return dbProducts.find(
      {
        companyId: this._id,
        overdue: 0
      },
      {
        sort: {
          createdAt: 1
        }
      }
    );
  }
});
Template.companyProductManage.events({
  'click [data-action="addProduct"]'(event) {
    event.preventDefault();
    rInAddProductMode.set(true);
  },
  'click [data-retrieve]'(event) {
    const productId = $(event.currentTarget).attr('data-retrieve');
    const productData = dbProducts.findOne(productId);
    if (productData) {
      alertDialog.confirm('確定要刪除「' + productData.productName + '」這項待上架產品嗎？', function(result) {
        if (result) {
          Meteor.customCall('retrieveProduct', productId);
        }
      });
    }
  }
});

inheritUtilForm(Template.companyProductEditForm);
Template.companyProductEditForm.onCreated(function() {
  this.validateModel = validateProductModel;
  this.saveModel = saveProductModel;
});
Template.companyProductEditForm.helpers({
  productTypeList() {
    return productTypeList;
  }
});
Template.companyProductEditForm.events({
  reset() {
    rInAddProductMode.set(false);
  }
});
function validateProductModel(model) {
  const error = {};
  if (model.productName.length < 4) {
    error.productName = '產品名稱字數過短！';
  }
  else if (model.productName.length > 255) {
    error.productName = '產品名稱字數過長！';
  }
  if (! SimpleSchema.RegEx.Url.test(model.url)) {
    error.url = '連結格式錯誤！';
  }

  if (_.size(error) > 0) {
    return error;
  }
}
function saveProductModel(model) {
  Meteor.customCall('createProduct', model, (error) => {
    if (! error) {
      rInAddProductMode.set(false);
    }
  });
}
