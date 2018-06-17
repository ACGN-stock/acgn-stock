import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import SimpleSchema from 'simpl-schema';

import { translatedMessages } from '/common/imports/utils/schemaHelpers';
import { inheritUtilForm } from '../utils/form';
import { alertDialog } from '../layout/alertDialog';

// TODO 將 server 端的定義一同合併
export const userTypeDisplayNameMap = {
  all: '全體玩家',
  active: '活躍玩家',
  recentlyLoggedIn: '近日內有登入的玩家',
  specified: '指定玩家'
};

// TODO 將 server 端的定義一同合併
export const giftTypeDisplayNameMap = {
  saintStone: '聖晶石',
  rainbowStone: '彩虹石',
  rainbowStoneFragment: '彩紅石碎片',
  questStone: '任務石',
  money: '金錢',
  voucher: '消費券',
  voteTicket: '推薦票'
};

const baseFormModelSchema = new SimpleSchema({
  userType: {
    label: '玩家類型',
    type: String,
    allowedValues: Object.keys(userTypeDisplayNameMap)
  },

  giftType: {
    label: '禮物類型',
    type: String,
    allowedValues: Object.keys(giftTypeDisplayNameMap)
  },

  amount: {
    label: '數量',
    type: SimpleSchema.Integer,
    min: 1
  },

  reason: {
    label: '送禮原因',
    type: String,
    min: 1,
    max: 200
  }
});
baseFormModelSchema.messageBox.setLanguage('zh-tw');
baseFormModelSchema.messageBox.messages(translatedMessages);

export const userTypeFormModelSchemaMap = {
  all: baseFormModelSchema,
  active: baseFormModelSchema,
  recentlyLoggedIn: baseFormModelSchema.clone().extend({
    days: {
      label: '天數',
      type: Number,
      min: 1
    }
  }),
  specified: baseFormModelSchema.clone().extend({
    users: {
      label: '玩家列表',
      type: Array,
      minCount: 1,
      defaultValue: []
    },
    'users.$': String
  })
};

inheritUtilForm(Template.controlCenterSendGiftForm);
Template.controlCenterSendGiftForm.onCreated(function() {
  this.getFormModelSchema = () => {
    return userTypeFormModelSchemaMap[this.model.get().userType] || baseFormModelSchema;
  };

  this.validateModel = (model) => {
    const error = {};

    const formModelSchema = this.getFormModelSchema();
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

    if (_.size(error) > 0) {
      return error;
    }
  };

  this.saveModel = (model) => {
    const formModelSchema = this.getFormModelSchema();
    const cleanedModel = formModelSchema.clean(model);

    alertDialog.confirm({
      message: '確定送出禮物嗎？',
      callback: (result) => {
        if (! result) {
          return;
        }

        Meteor.customCall('adminSendGift', cleanedModel, (err) => {
          if (! err) {
            alertDialog.alert('禮物送出成功！');
          }
        });
      }
    });
  };

  this.onAddUser = () => {
    const userId = this.$('[name="userId"]').val();

    if (! userId) {
      return;
    }

    const model = this.model.get();
    if (! model.users) {
      model.users = [];
    }

    if (model.users.includes(userId)) {
      return;
    }

    model.users.push(userId);
    this.model.set(model);
    this.$('[name="userId"]').val('');
  };
});

Template.controlCenterSendGiftForm.events({
  reset(event, templateInstance) {
    event.preventDefault();
    const model = templateInstance.model.get();
    templateInstance.$('select[name]').each((i, e) => {
      const name = $(e).attr('name');
      $(e).val(model[name] || '');
    });
  },
  'click [data-action="addUser"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.onAddUser();
  },
  'click [data-action="removeUser"]'(event, templateInstance) {
    event.preventDefault();
    const userId = templateInstance.$(event.currentTarget).attr('data-user-id');
    const model = templateInstance.model.get();

    if (! model.users) {
      return;
    }

    model.users = _.without(model.users, userId);
    templateInstance.model.set(model);
  },
  'keydown input[name="userId"]'(event, templateInstance) {
    if (event.which === 13) { // return
      event.preventDefault();
      templateInstance.onAddUser();
    }
  }
});

Template.controlCenterSendGiftForm.helpers({
  schema() {
    return Template.instance().getFormModelSchema();
  },
  userTypeDisplayName(userType) {
    return userTypeDisplayNameMap[userType];
  },
  userTypeMatches(userType) {
    return Template.instance().model.get().userType === userType;
  },
  giftTypeDisplayName(giftType) {
    return giftTypeDisplayNameMap[giftType];
  }
});
