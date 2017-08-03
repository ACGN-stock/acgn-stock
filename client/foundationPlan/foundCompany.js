'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';
import { inheritUtilForm, handleInputChange as inheritedHandleInputChange } from '../utils/form';
import { dbFoundations } from '../../db/dbFoundations';
import { addTask, resolveTask } from '../layout/loading';
import { regImageDataUrl } from '../utils/regexp';

Template.createFoundationPlan.helpers({
  defaultData() {
    return {
      companyName: '',
      tags: [],
      description: ''
    };
  }
});
Template.editFoundationPlan.onCreated(function() {
  const foundationId = FlowRouter.getParam('foundationId');
  addTask();
  this.subscribe('foundationPlanById', foundationId, resolveTask);
});
Template.editFoundationPlan.helpers({
  editData() {
    const foundationId = FlowRouter.getParam('foundationId');

    return dbFoundations.findOne(foundationId);
  }
});

inheritUtilForm(Template.foundCompanyForm);
Template.foundCompanyForm.onCreated(function() {
  this.validateModel = validateModel;
  this.handleInputChange = handleInputChange;
  this.saveModel = saveModel;
});

function validateModel(model) {
  const error = {};
  if (! model.companyName.length) {
    error.companyName = '請輸入角色名稱！';
  }
  else if (model.companyName.length > 100) {
    error.companyName = '角色名稱字數過長！';
  }
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
  if (model.pictureSmall && model.pictureSmall.length > 262144) {
    error.pictureSmall = '檔案Size過大！';
  }
  else if (! regImageDataUrl.test(model.pictureSmall)) {
    error.pictureSmall = '檔案格式不符！';
  }
  if (model.pictureBig && model.pictureBig.length > 1048576) {
    error.pictureBig = '檔案Size過大！';
  }
  else if (! regImageDataUrl.test(model.pictureBig)) {
    error.pictureBig = '檔案格式不符！';
  }
  if (model.description.length < 10) {
    error.description = '介紹文字過少！';
  }
  if (model.description.length > 3000) {
    error.description = '介紹文字過多！';
  }

  if (_.size(error) > 0) {
    return error;
  }
}

function handleInputChange(event) {
  switch (event.currentTarget.name) {
    case 'tags': {
      break;
    }
    case 'pictureSmall':
    case 'pictureBig': {
      const fieldName = event.currentTarget.name;
      const model = _.clone(this.model.get());
      const reader = new FileReader();
      const file = event.currentTarget.files[0];
      if (! file) {
        delete model[fieldName];
        this.model.set(model);

        return false;
      }
      reader.readAsDataURL(file, 'utf8');
      $(reader).on('load', () => {
        const dataUrl = reader.result;
        model[fieldName] = dataUrl;
        this.model.set(model);
      });
      break;
    }
    default: {
      inheritedHandleInputChange.call(this, event);
      break;
    }
  }
}

function saveModel(model) {
  if (model._id) {
    const editData = _.omit(model, 'manager', 'invest', 'createdAt');
    Meteor.call('editFoundCompany', editData, (error) => {
      if (! error) {
        const path = FlowRouter.path('foundationPlan');
        FlowRouter.go(path);
      }
    });
  }
  else {
    Meteor.call('foundCompany', model, (error) => {
      if (! error) {
        const path = FlowRouter.path('foundationPlan');
        FlowRouter.go(path);
      }
    });
  }
}

const previewPictureType = new ReactiveVar('');
Template.foundCompanyForm.helpers({
  isPreview(pictureType) {
    return previewPictureType.get() === pictureType;
  },
  getFoundationPlanHref() {
    return FlowRouter.path('foundationPlan');
  }
});

Template.foundCompanyForm.events({
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
  model.tags.push($input.val());
  model.tags = _.unique(model.tags);
  templatInstance.model.set(model);
  $input.val('');
}
