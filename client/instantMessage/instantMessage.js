'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbInstantMessage } from '../../db/dbInstantMessage';

Template.instantMessageChatForm.onRendered(function() {
  this.$message = this.$('[name="message"]');
});
Template.instantMessageChatForm.events({
  submit(event, templateInstance) {
    event.preventDefault();
    const message = templateInstance.$message.val();
    if (message) {
      Meteor.call('instantMessageChat', message, () => {
        templateInstance.$message.val('');
      });
    }
  }
});

const messageTypeGroupHash = {
  '交易相關': [
    '交易紀錄',
    '購買下單',
    '販賣下單',
    '取消下單',
    '公司釋股'
  ],
  '新創相關': [
    '創立公司',
    '參與投資',
    '創立失敗',
    '創立成功'
  ],
  '競選相關': [
    '參選紀錄',
    '就任經理',
    '辭職紀錄'
  ]
};
const rFilterTypeList = new ReactiveVar([
  '發薪紀錄',
  '創立得股',
  '訂單完成',
  '營利分紅',
  '舉報公司',
  '舉報產品',
  '公司撤銷',
  '取消資格',
  //以上是不能篩掉的即時訊息類別
  '聊天發言',
  '創立公司',
  '參與投資',
  '創立失敗',
  '創立成功',
  '公司釋股',
  '交易紀錄',
  '購買下單',
  '販賣下單',
  '取消下單',
  '參選紀錄',
  '就任經理',
  '辭職紀錄',
  '經理管理',
  '推薦產品'
  //以上是可以篩掉的
]);
Template.instantMessageFilterButton.helpers({
  btnClass() {
    const btnType = this.type;
    const messageTypeList = messageTypeGroupHash[btnType] || [btnType];
    if (_.contains(rFilterTypeList.get(), messageTypeList[0])) {
      return 'btn btn-sm btn-primary';
    }
    else {
      return 'btn btn-sm btn-outline-primary';
    }
  },
  btnText() {
    return this.type;
  }
});
Template.instantMessageFilterButton.events({
  'click'(event, templateInstance) {
    event.preventDefault();
    const btnType = templateInstance.data.type;
    const messageTypeList = messageTypeGroupHash[btnType] || [btnType];
    const previousFilterTypeList = rFilterTypeList.get();
    if (_.intersection(previousFilterTypeList, messageTypeList).length > 0) {
      rFilterTypeList.set(_.difference(previousFilterTypeList, messageTypeList));
    }
    else {
      rFilterTypeList.set(previousFilterTypeList.concat(messageTypeList));
    }
  }
});

Template.instantMessageList.onCreated(function() {
  this.subscribe('instantMessage');
});
Template.instantMessageList.helpers({
  messageList() {
    return dbInstantMessage.find(
      {
        type: {
          $in: rFilterTypeList.get()
        }
      },
      {
        sort: {
          createdAt: -1
        }
      }
    );
  },
  getTypeHtml(instantMessageData) {
    switch (instantMessageData.type) {
      case '聊天發言': {
        return '使用者' + instantMessageData.source + '說：';
      }
      default: {
        return '【' + instantMessageData.type + '】';
      }
    }
  }
});
