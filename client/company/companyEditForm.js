import SimpleSchema from 'simpl-schema';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';

import { inheritUtilForm, handleInputChange as inheritedHandleInputChange } from '../utils/form';
import { alertDialog } from '../layout/alertDialog';
import { bigPicturePreviewModal } from '../layout/bigPicturePreviewModal';
import { markdown } from '../utils/helpers';

inheritUtilForm(Template.companyEditForm);

Template.companyEditForm.onCreated(function() {
  this.validateModel = validateCompanyModel;
  this.handleInputChange = handleCompanyInputChange;
  this.saveModel = saveCompanyModel;
  description.set(Template.currentData().description);
  this.autorun(() => {
    this.model.set(Template.currentData());
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
  const submitData = {
    pictureSmall: null,
    pictureBig: null,
    ..._.pick(model, 'tags', 'pictureSmall', 'pictureBig', 'description')
  };
  Meteor.customCall('editCompany', companyId, submitData, (error) => {
    if (! error) {
      const path = FlowRouter.path('companyDetail', { companyId });
      FlowRouter.go(path);
    }
  });
}

const previewPictureType = new ReactiveVar('');
const description = new ReactiveVar('');
Template.companyEditForm.helpers({
  isPreview(pictureType) {
    return previewPictureType.get() === pictureType;
  },
  getCompanyHref(companyId) {
    return FlowRouter.path('companyDetail', { companyId });
  },
  previewDescription() {
    return markdown(description.get());
  }
});

Template.companyEditForm.events({
  'click [data-remove-tag]'(event, templateInstance) {
    const tag = $(event.currentTarget).attr('data-remove-tag');
    const model = _.clone(templateInstance.model.get());
    model.tags = _.without(model.tags, tag);
    templateInstance.model.set(model);
  },
  'keypress [name="tags"]'(event, templateInstance) {
    if (event.which === 13) {
      event.preventDefault();
      event.stopPropagation();
      addNewTag(event, templateInstance);
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

      if (type === 'pictureBig') {
        bigPicturePreviewModal.show({
          'src': this.pictureBig,
          'switch': previewPictureType
        });
      }
    }
  },
  'keyup [name="description"]'(event) {
    description.set($(event.currentTarget).val());
  }
});

function addNewTag(event, templateInstance) {
  const $input = templateInstance.$input.filter('[name="tags"]');
  const model = _.clone(templateInstance.model.get());
  const tag = $input.val().trim();
  if (! tag) {
    alertDialog.alert('請輸入標籤名稱！');

    return false;
  }
  model.tags.push(tag);
  model.tags = _.unique(model.tags);
  templateInstance.model.set(model);
  $input.val('');
}

