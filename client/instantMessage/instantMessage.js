'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';

let lastQueryInstantMessageTime = Date.now() - 60000;
const rInstantMessageList = new ReactiveVar([]);
Meteor.setInterval(queryInstantMessage, 5000);
function queryInstantMessage() {
  if (shouldStopSubscribe()) {
    return false;
  }
  Meteor.call('queryInstantMessage', lastQueryInstantMessageTime, (error, result) => {
    if (! error) {
      lastQueryInstantMessageTime = result.lastTime || (Date.now() - 60000);
      const oldMessageList = rInstantMessageList.get();
      const oldMessageIdList = _.pluck(oldMessageList, '_id');
      const listResult = _.chain(result.list)
        .sortBy('createdAt')
        .reverse()
        .map((message) => {
          message.createdAt = new Date(message.createdAt);

          return message;
        })
        .reject((message) => {
          return _.contains(oldMessageIdList, message._id);
        })
        .value();

      rInstantMessageList.set(listResult.concat(oldMessageList));
    }
  });
}
Template.instantMessage.events({
  'click [data-action="clearMessage"]'(event) {
    event.preventDefault();
    rInstantMessageList.set([]);
  }
});

Template.instantMessageChatForm.onRendered(function() {
  this.$message = this.$('[name="message"]');
});
Template.instantMessageChatForm.events({
  submit(event, templateInstance) {
    event.preventDefault();
    const message = templateInstance.$message.val();
    if (message.length > 255) {
      alertDialog.alert('輸入訊息過長！');
    }
    else if (message.length) {
      Meteor.customCall('instantMessageChat', message, () => {
        templateInstance.$message.val('');
      });
    }
  }
});

//不能篩掉、永遠顯示的紀錄類別
const alwaysDisplayLogTypeList = [
  '發薪紀錄',
  '公司撤銷',
  '取消資格',
  '廣告宣傳',
  '廣告追加'
];
//不能篩掉但只顯示userId中包含自己的紀錄類別
// const forSelfLogTypeList = [
//   '創立得股',
//   '創立退款',
//   '訂單完成',
//   '營利分紅'
// ];
//篩選器可以選擇的紀錄類別
const messageTypeGroupHash = {
  '聊天發言': [
    '聊天發言'
  ],
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
    '辭職紀錄',
    '支持紀錄'
  ],
  '經理管理': [
    '經理管理'
  ],
  '推薦產品': [
    '推薦產品'
  ]
};
const defaultFilterValue = _.chain(messageTypeGroupHash)
  .flatten()
  .values()
  .value()
  .concat(alwaysDisplayLogTypeList);
const rFilterTypeList = new ReactiveVar(defaultFilterValue);
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
      rFilterTypeList.set(_.union(previousFilterTypeList, messageTypeList));
    }
  }
});

Template.instantMessageList.helpers({
  logList() {
    const user = Meteor.user();
    const userId = user ? user._id : '';
    const filterTypeList = rFilterTypeList.get();
    const displayLogList = _.filter(rInstantMessageList.get(), (logData) => {
      return (
        _.contains(filterTypeList, logData.logType) ||
        (
          userId &&
          logData.userId &&
          _.contains(logData.userId, userId)
        )
      );
    });

    return displayLogList;
  }
});
