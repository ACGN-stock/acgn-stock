import SimpleSchema from 'simpl-schema';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';

import { inheritUtilForm } from '../utils/form';
import { bigPicturePreviewModal } from '../layout/bigPicturePreviewModal';

const description = new ReactiveVar('');
const previewPictureType = new ReactiveVar('');
inheritUtilForm(Template.accountAboutEditForm);

Template.accountAboutEditForm.onCreated(function() {
  this.validateModel = validateAboutModel;
  this.saveModel = saveAboutModel;
  description.set(Template.currentData().description);
  this.autorun(() => {
    this.model.set(Template.currentData());
  });
});

function validateAboutModel(model) {
  const error = {};
  if (model.picture) {
    if (! SimpleSchema.RegEx.Url.test(model.picture)) {
      error.picture = '連結格式錯誤！';
    }
  }

  if (model.description.length > 3000) {
    error.description = '介紹文字過多！';
  }

  if (_.size(error) > 0) {
    return error;
  }
}

function saveAboutModel(model) {
  const submitData = {
    picture: null,
    ..._.pick(model, 'picture', 'description')
  };
  Meteor.customCall('editUserAbout', submitData, (error) => {
    if (! error) {
      const path = FlowRouter.path('accountInfo', { userId: model._id });
      FlowRouter.go(path);
    }
  });
}

Template.accountAboutEditForm.events({
  'click [data-preview]'(event) {
    const type = $(event.currentTarget).attr('data-preview');
    if (type === previewPictureType.get()) {
      previewPictureType.set('');
    }
    else {
      previewPictureType.set(type);

      if (type === 'picture') {
        bigPicturePreviewModal.show({
          'src': this.picture,
          'switch': previewPictureType
        });
      }
    }
  },
  'keyup [name="description"]'(event) {
    description.set($(event.currentTarget).val());
  }
});

Template.accountAboutEditForm.helpers({
  isPreview(pictureType) {
    return previewPictureType.get() === pictureType;
  },
  getAccountHref(userId) {
    return FlowRouter.path('accountInfo', { userId });
  }
});
