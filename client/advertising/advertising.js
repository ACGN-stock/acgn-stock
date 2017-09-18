'use strict';
import SimpleSchema from 'simpl-schema';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbAdvertising } from '../../db/dbAdvertising';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { inheritUtilForm, handleInputChange as inheritedHandleInputChange } from '../utils/form';
import { formatDateText } from '../utils/helpers';
import { config } from '../../config';
import { integerString } from '../utils/regexp';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';

inheritedShowLoadingOnSubscribing(Template.advertising);
const rInBuyAdvertisingMode = new ReactiveVar(false);
Template.advertising.onCreated(function() {
  rInBuyAdvertisingMode.set(false);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('allAdvertising');
  });
});
Template.advertising.helpers({
  inBuyMode() {
    return rInBuyAdvertisingMode.get() && Meteor.user();
  },
  defaultAdvertisingData() {
    const user = Meteor.user();

    return {
      userId: user._id,
      paid: 1,
      message: '',
      url: '',
      extraPaid: 0
    };
  },
  advertisingList() {
    return dbAdvertising.find({}, {
      sort: {
        paid: -1
      }
    });
  },
  advertisingDisplayClass(advertisingDisplayIndex) {
    if (advertisingDisplayIndex < config.displayAdvertisingNumber) {
      return 'table-success';
    }
  },
  formatExpireDate(advertisingData) {
    const createdAtTime = advertisingData.createdAt.getTime();
    const expireTime = new Date(createdAtTime + config.advertisingExpireTime);

    return formatDateText(expireTime);
  }
});
Template.advertising.events({
  'click [data-action="buyAdvertising"]'(event) {
    event.preventDefault();
    rInBuyAdvertisingMode.set(true);
  },
  'click [data-add-pay]'(event) {
    event.preventDefault();
    const advertisingId = $(event.currentTarget).attr('data-add-pay');
    const advertisingData = dbAdvertising.findOne(advertisingId);
    if (advertisingData) {
      if (advertisingData.userId !== Meteor.user()._id) {
        alertDialog.confirm('您並非該廣告的初始購買人，確定要在這個廣告上追加廣告金額嗎？', (result) => {
          if (result) {
            showAskAddPayDialog(advertisingId);
          }
        });
      }
      else {
        showAskAddPayDialog(advertisingId);
      }
    }
  },
  'click [data-take-down]'(event) {
    event.preventDefault();
    const advertisingId = $(event.currentTarget).attr('data-take-down');
    const advertisingData = dbAdvertising.findOne(advertisingId);
    alertDialog.confirm('確定要撤銷廣告「' + advertisingData.message + '」？', (result) => {
      if (result) {
        Meteor.customCall('takeDownAdvertising', advertisingId);
      }
    });
  }
});
function showAskAddPayDialog(advertisingId) {
  alertDialog.dialog({
    type: 'prompt',
    title: '追加廣告金額',
    message: '請輸入要額外追加的廣告金額：',
    defaultValue: null,
    callback: function(result) {
      const addPay = parseInt(result, 10);
      if (addPay) {
        Meteor.customCall('addAdvertisingPay', advertisingId, addPay);
      }
    }
  });
}

inheritUtilForm(Template.buyAdvertisingForm);
Template.buyAdvertisingForm.onCreated(function() {
  this.validateModel = validateAdvertisingModel;
  this.handleInputChange = handleAdvertisingInputChange;
  this.saveModel = saveAdvertisingModel;
  this.computeMinimumPaid = computeMinimumPaid;
});
Template.buyAdvertisingForm.helpers({
  getDisplayMinimumPaid() {
    const lastDisplayAdvertising = dbAdvertising.findOne({}, {
      sort: {
        paid: -1
      },
      fields: {
        paid: 1
      },
      skip: 4
    });

    return lastDisplayAdvertising ? (lastDisplayAdvertising.paid + 1) : 1;
  }
});
Template.buyAdvertisingForm.events({
  reset() {
    rInBuyAdvertisingMode.set(false);
  }
});
function validateAdvertisingModel(model) {
  const error = {};
  if (model.message < 1) {
    error.message = '請輸入廣告訊息！';
  }
  if (model.url.length && ! SimpleSchema.RegEx.Url.test(model.url)) {
    error.url = '格式不符！';
  }
  if (! integerString.test(model.extraPaid)) {
    error.extraPaid = '錯誤的輸入值！';
  }
  if (_.size(error) > 0) {
    return error;
  }
}
function handleAdvertisingInputChange(event) {
  switch (event.currentTarget.name) {
    case 'message': {
      inheritedHandleInputChange.call(this, event);
      this.computeMinimumPaid();
      break;
    }
    case 'url': {
      inheritedHandleInputChange.call(this, event);
      this.computeMinimumPaid();
      break;
    }
    default: {
      inheritedHandleInputChange.call(this, event);
      break;
    }
  }
}
function saveAdvertisingModel(model) {
  const submitData = _.pick(model, 'paid', 'message');
  submitData.paid += parseInt(model.extraPaid, 10);
  let totalPaid = submitData.paid;
  let advertisingSample = submitData.message;
  if (model.url.length > 0) {
    submitData.url = model.url;
    totalPaid += 100;
    advertisingSample = `
      <a href="${submitData.url}" target="_blank">
        ${advertisingSample}
      </a>
    `;
  }
  const message = `
    <div>廣告總支出：$${totalPaid}</div>
    <div>廣告內容：${advertisingSample}</div>
    <div>確定發出廣告嗎？</div>
  `;
  alertDialog.confirm(message, (result) => {
    if (result) {
      Meteor.customCall('buyAdvertising', submitData, () => {
        rInBuyAdvertisingMode.set(false);
      });
    }
  });
}

function computeMinimumPaid() {
  const model = _.clone(this.model.get());
  const minimumPaid = (
    (model.url.length > 0 ? 100 : 0) +
    model.message.length
  );
  if (minimumPaid !== model.paid) {
    model.paid = minimumPaid;
    this.model.set(model);
  }
}
