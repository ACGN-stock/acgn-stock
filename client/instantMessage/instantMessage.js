'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbLog } from '../../db/dbLog';
import { dbResourceLock } from '../../db/dbResourceLock';
import { getCompanyLink, getAccountInfoLink } from '../utils/helpers';

const rReadInstantMessageDate = new ReactiveVar(new Date());
Tracker.autorun(function() {
  if (dbResourceLock.find('season').count()) {
    return false;
  }
  Meteor.subscribe('instantMessage', rReadInstantMessageDate.get());
});
Template.instantMessage.events({
  'click [data-action="clearMessage"]'(event) {
    event.preventDefault();
    rReadInstantMessageDate.set(new Date());
  }
});

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
    '辭職紀錄',
    '支持紀錄'
  ]
};
const rFilterTypeList = new ReactiveVar([
  // '驗證通過',
  // '免費得石',
  // '舉報公司',
  // '舉報產品',
  //以上訊息不進即時訊息
  // '創立得股',
  // '創立退款',
  // '訂單完成',
  // '營利分紅',
  //以上訊息只顯示username中包含自己的紀錄
  '發薪紀錄',
  '公司撤銷',
  '取消資格',
  '聊天發言',
  //以上是不能篩掉的紀錄
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
  '支持紀錄',
  '經理管理',
  '推薦產品'
  //以上是可以篩掉的紀錄
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

Template.instantMessageList.helpers({
  logList() {
    const user = Meteor.user();
    const username = user ? user.username : '';

    return dbLog.find(
      {
        $or: [
          {
            username: username,
            logType: {
              $in: [
                '創立得股',
                '創立退款',
                '訂單完成',
                '營利分紅'
              ]
            }
          },
          {
            logType: {
              $in: rFilterTypeList.get()
            }
          }
        ]
      },
      {
        sort: {
          createdAt: -1
        }
      }
    );
  },
  getTypeHtml(log) {
    switch (log.logType) {
      case '聊天發言': {
        return '使用者' + getAccountInfoLink(log.username[0]) + '說道：「' + log.message + '」';
      }
      case '發薪紀錄': {
        return '【發薪紀錄】系統向所有已驗證通過的使用者發給了$' + log.price + '的薪水！';
      }
      case '創立公司': {
        return (
          '【創立公司】' +
          getAccountInfoLink(log.username[0]) +
          '發起了「' + log.companyName + '」的新公司創立計劃，誠意邀請有意者投資！'
        );
      }
      case '參與投資': {
        return (
          '【參與投資】' +
          getAccountInfoLink(log.username[0]) +
          '向「' + log.companyName + '公司創立計劃」投資了$' + log.amount + '！'
        );
      }
      case '創立失敗': {
        return (
          '【創立失敗】' +
          _.tap(log.username, getAccountInfoLink).join('、') +
          '等人投資的「' + log.companyName + '公司創立計劃」由於投資人數不足失敗了，投資金額將全數返回！'
        );
      }
      case '創立成功': {
        return (
          '【創立成功】' +
          _.tap(log.username, getAccountInfoLink).join('、') +
          '等人投資的「' + getCompanyLink(log.companyName) +
          '公司創立計劃」成功了，該公司正式上市，初始股價為$' + log.price + '！'
        );
      }
      case '創立得股': {
        return (
          '【創立得股】' +
          '對「' + getCompanyLink(log.companyName) +
          '公司創立計劃」的$' + log.price + '投資為你帶來了' +
          log.amount + '數量的公司股票！'
        );
      }
      case '創立退款': {
        return (
          '【創立退款】' +
          '從「' + getCompanyLink(log.companyName) +
          '公司創立計劃」收回了$' + log.amount + '的投資退款！'
        );
      }
      case '購買下單': {
        return (
          '【購買下單】' +
          getAccountInfoLink(log.username[0]) +
          '想要用每股$' + log.price + '的單價購買' + log.amount +
          '數量的「' + getCompanyLink(log.companyName) + '」公司股票！'
        );
      }
      case '販賣下單': {
        return (
          '【販賣下單】' +
          getAccountInfoLink(log.username[0]) +
          '想要用每股$' + log.price + '的單價販賣' + log.amount +
          '數量的「' + getCompanyLink(log.companyName) + '」公司股票！'
        );
      }
      case '取消下單': {
        return (
          '【取消下單】' +
          getAccountInfoLink(log.username[0]) +
          '取消了以每股$' + log.price + '的單價' + log.message + log.amount +
          '數量的「' + getCompanyLink(log.companyName) + '」公司股票的訂單！'
        );
      }
      case '訂單完成': {
        return (
          '【訂單完成】' +
          '您以每股$' + log.price + '的單價' + log.message + log.amount +
          '數量的「' + getCompanyLink(log.companyName) + '」公司股票的訂單已經全數交易完畢！'
        );
      }
      case '公司釋股': {
        return (
          '【公司釋股】' +
          '由於股價持續高漲，「' + getCompanyLink(log.companyName) + '」公司以$' +
          log.price + '的價格釋出了' + log.amount + '數量的股票到市場上套取利潤！'
        );
      }
      case '交易紀錄': {
        return (
          '【交易紀錄】' +
          getAccountInfoLink(log.username[0]) + '以$' + log.price + '的單價向' +
          (log.username[1] ? getAccountInfoLink(log.username[1]) : '「' + getCompanyLink(log.companyName) + '」公司') +
          '購買了' + log.amount + '數量的「' +
          getCompanyLink(log.companyName) + '」公司股票！'
        );
      }
      case '辭職紀錄': {
        return (
          '【辭職紀錄】' +
          getAccountInfoLink(log.username[0]) +
          '辭去了「' + getCompanyLink(log.companyName) + '」公司的經理人職務！'
        );
      }
      case '參選紀錄': {
        return (
          '【參選紀錄】' +
          getAccountInfoLink(log.username[0]) +
          '開始競選「' + getCompanyLink(log.companyName) +
          '」公司的經理人職務！'
        );
      }
      case '支持紀錄': {
        return (
          '【支持紀錄】' +
          getAccountInfoLink(log.username[0]) +
          '開始支持' + getAccountInfoLink(log.username[1]) +
          '擔任「' + getCompanyLink(log.companyName) + '」公司的經理人。'
        );
      }
      case '經理管理': {
        return (
          '【經理管理】' +
          getAccountInfoLink(log.username[0]) +
          '修改了「' + getCompanyLink(log.companyName) + '」公司的資訊！'
        );
      }
      case '推薦產品': {
        return (
          '【推薦產品】' +
          getAccountInfoLink(log.username[0]) +
          '向「' + getCompanyLink(log.companyName) +
          '」公司的一項產品投了一張推薦票，使其獲得了$' + log.price + '的營利額！'
        );
      }
      case '就任經理': {
        let extraDescription = '';
        if (log.username[1] === '!none') {
          extraDescription = '成為了公司的經理人。';
        }
        else if (log.username[0] === log.username[1]) {
          extraDescription = '繼續擔任「' + getCompanyLink(log.companyName) + '」公司的經理人職務。';
        }
        else {
          extraDescription = '取代了' + getAccountInfoLink(log.username[1]) + '成為了「' + getCompanyLink(log.companyName) + '」公司的經理人。';
        }

        return (
          '【就任經理】' +
          getAccountInfoLink(log.username[0]) + '在' + log.message + '商業季度' +
          (log.amount ? ('以' + log.amount + '數量的支持股份') : '') +
          '擊敗了所有競爭對手，' + extraDescription
        );
      }
      case '公司營利': {
        return (
          '【公司營利】' +
          '「' + getCompanyLink(log.companyName) +
          '」公司在本商業季度一共獲利$' + log.amount + '！'
        );
      }
      case '營利分紅': {
        return (
          '【營利分紅】' +
          '你得到了「' + getCompanyLink(log.companyName) +
          '」公司的分紅$' + log.amount + '！'
        );
      }
      case '公司撤銷': {
        return (
          '【公司撤銷】' +
          getAccountInfoLink(log.username[0]) +
          '以「' + log.message + '」理由撤銷了「' +
          getCompanyLink(log.companyName) + '」公司！'
        );
      }
      case '取消資格': {
        return (
          '【取消資格】' +
          getAccountInfoLink(log.username[0]) +
          '以「' + log.message + '」理由取消了' +
          getAccountInfoLink(log.username[1]) + '擔任經理人的資格！'
        );
      }
    }
  }
});
