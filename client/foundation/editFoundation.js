'use strict';
import SimpleSchema from 'simpl-schema';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbFoundations } from '/db/dbFoundations';
import { dbVariables } from '/db/dbVariables';
import { inheritUtilForm, handleInputChange as inheritedHandleInputChange } from '../utils/form';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { bigPicturePreviewModal } from '../layout/bigPicturePreviewModal';
import { shouldStopSubscribe } from '../utils/idle';
import { currencyFormat, markdown } from '../utils/helpers.js';

Template.createFoundationPlan.helpers({
  defaultData() {
    return {
      companyName: '',
      tags: [],
      description: ''
    };
  }
});
inheritedShowLoadingOnSubscribing(Template.editFoundationPlan);
Template.editFoundationPlan.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const foundationId = FlowRouter.getParam('foundationId');
    if (foundationId) {
      this.subscribe('foundationDataForEdit', foundationId);
    }
  });
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
    default: {
      inheritedHandleInputChange.call(this, event);
      break;
    }
  }
}

function saveModel(model) {
  const foundationId = model._id;
  if (foundationId) {
    const submitData = _.pick(model, '_id', 'tags', 'pictureSmall', 'pictureBig', 'description');
    Meteor.customCall('editFoundCompany', submitData, (error) => {
      if (! error) {
        const path = FlowRouter.path('foundationDetail', { foundationId });
        FlowRouter.go(path);
      }
    });
  }
  else {
    const message = `
      <div>新創計劃一經送出就不可修改，一但新創失敗，將會被沒收投資保證金<span class="text-info">$${currencyFormat(Meteor.settings.public.founderEarnestMoney)}</span>。</div>
      <div class="text-danger">創立重複、無ACG點等違反金管會規則的角色將視情節處以罰款或永久停權。</div>
      <div>請再次輸入角色名稱以表示確定。</div>
    `;
    alertDialog.prompt({
      message,
      callback: (companyName) => {
        if (companyName === model.companyName) {
          Meteor.customCall('foundCompany', model, (error) => {
            if (! error) {
              const path = FlowRouter.path('foundationList');
              FlowRouter.go(path);
            }
          });
        }
      }
    });
  }
}

const previewPictureType = new ReactiveVar('');
const description = new ReactiveVar('');
Template.foundCompanyForm.helpers({
  fscRuleURL() {
    return dbVariables.get('fscRuleURL');
  },
  isCompanyNameDisabled() {
    const templateInstance = Template.instance();

    return !! templateInstance.model.get()._id;
  },
  isPreview(pictureType) {
    return previewPictureType.get() === pictureType;
  },
  getFoundationPlanHref() {
    const templateInstance = Template.instance();
    const foundationId = templateInstance.model.get()._id;
    if (foundationId) {
      return FlowRouter.path('foundationDetail', { foundationId });
    }

    return FlowRouter.path('foundationList');
  },
  previewDescription() {
    return markdown(description.get());
  }
});

Template.foundCompanyForm.events({
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

