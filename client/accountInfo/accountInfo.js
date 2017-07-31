'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbLog } from '../../db/dbLog';
import { dbCompanies } from '../../db/dbCompanies';
import { addTask, resolveTask } from '../layout/loading';
import { getCompanyLink } from '../utils/helpers';

export const rSearchUsername = new ReactiveVar('');
Template.accountInfo.onCreated(function() {
  this.autorun(() => {
    addTask();
    this.subscribe('accountInfo', rSearchUsername.get(), resolveTask);
  });
});

Template.accountInfoSearchForm.onRendered(function() {
  this.$searchUsername = this.$('[name="searchUsername"]');
});
Template.accountInfoSearchForm.helpers({
  isInLookMode(lookMode) {
    return (rSearchUsername.get() === '' ? 'self' : 'other') === lookMode;
  },
  searchUsername() {
    return rSearchUsername.get();
  }
});
Template.accountInfoSearchForm.events({
  'change [name="lookMode"][value="self"]'() {
    const path = FlowRouter.path('accountInfo');
    FlowRouter.go(path);
  },
  submit(event, templateInstance) {
    event.preventDefault();
    const username = templateInstance.$searchUsername.val();
    if (! username || username === Meteor.user().username) {
      const path = FlowRouter.path('accountInfo');
      FlowRouter.go(path);
      rSearchUsername.set('');
    }
    else {
      const path = FlowRouter.path('accountInfo', {username});
      FlowRouter.go(path);
    }
  }
});

Template.accountInfoBasic.helpers({
  lookUser() {
    const username = rSearchUsername.get();

    if (username) {
      return Meteor.users.findOne({username});
    }
    else {
      return Meteor.user();
    }
  },
  manageCompanies(manager) {
    return dbCompanies.find({manager});
  }
});

Template.accountInfoManageCompanyLink.helpers({
  getHref(companyName) {
    return FlowRouter.path('company', {companyName});
  }
});

Template.accountInfoLogList.onCreated(function() {
  if (Meteor.userId()) {
    this.autorun(() => {
      this.logOffset = 0;
      this.subscribe('accountInfoLog', rSearchUsername.get(), this.logOffset);
    });
  }
});
Template.accountInfoLogList.helpers({
  logList() {
    return dbLog.find({
      username: rSearchUsername.get() || Meteor.user().username
    }, {
      sort: {
        createdAt: -1
      }
    });
  }
});
Template.accountInfoLogList.events({
  'click [data-action="more"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.logOffset += 50;
    addTask();
    templateInstance.subscribe('accountInfoLog', rSearchUsername.get(), templateInstance.logOffset, resolveTask);
  }
});

Template.accountInfoLog.helpers({
  getLogDescriptionHtml(logData) {
    switch (logData.logType) {
      case '驗證通過': {
        return '帳號驗證通過，領取起始資金$' + logData.price + '。';
      }
      case '發薪紀錄': {
        return '從系統領取了薪水$' + logData.price + '。';
      }
      case '創立公司': {
        return '發起了「' + logData.companyName + '」的新公司創立計劃。';
      }
      case '參與投資': {
        return '向「' + logData.companyName + '」的新公司創立計劃投資了$' + logData.amount + '。';
      }
      case '創立失敗': {
        return '由於參與的「' + logData.companyName + '」的新公司創立計劃失敗，領回了所有投資金額。';
      }
      case '創立成功': {
        if (logData.username[0] === Meteor.user().username) {
          return '發起的「' + getCompanyLink(logData.companyName) + '」的新公司創立計劃獲得成功，自動就任該公司經理人。';
        }
        else {
          return '參與的「' + getCompanyLink(logData.companyName) + '」的新公司創立計劃獲得成功。';
        }
      }
      case '創立得股': {
        return '獲得了' + logData.amount + '數量的「' + getCompanyLink(logData.companyName) + '」公司創立股份。';
      }
      case '購買下單': {
        return '下達了以每股單價$' + logData.price + '的單價購入' + logData.amount + '數量的「' + getCompanyLink(logData.companyName) + '」公司股票的訂單。';
      }
      case '販賣下單': {
        return '下達了以每股單價$' + logData.price + '的單價賣出' + logData.amount + '數量的「' + getCompanyLink(logData.companyName) + '」公司股票的訂單。';
      }
      case '取消下單': {
        return '取消了以每股單價$' + logData.price + '的單價' + logData.message + logData.amount + '數量的「' + getCompanyLink(logData.companyName) + '」公司股票的訂單，並付出了$1的手續費。';
      }
      case '訂單完成': {
        return '以每股單價$' + logData.price + '的單價' + logData.message + logData.amount + '數量的「' + getCompanyLink(logData.companyName) + '」公司股票的訂單已全數交易完成。';
      }
      case '賣單撤銷': {
        return '由於股價低落，以每股單價$' + logData.price + '的單價賣出' + logData.amount + '數量的「' + getCompanyLink(logData.companyName) + '」公司股票的訂單被系統自動取消了。';
      }
      case '交易紀錄': {
        if (logData.username[0] === Meteor.user().username) {
          return '以$' + logData.price + '的單價向' + (logData.username[1] || ('「' + getCompanyLink(logData.companyName) + '」公司')) + '購買了' + logData.amount + '數量的「' + logData.companyName + '」公司股票！';
        }
        else {
          return '以$' + logData.price + '的單價向' + logData.username[1] + '賣出了' + logData.amount + '數量的「' + logData.companyName + '」公司股票！';
        }
      }
      case '辭職紀錄': {
        return '辭去了「' + getCompanyLink(logData.companyName) + '」公司的經理人職務。';
      }
      case '參選紀錄': {
        return '參與了「' + getCompanyLink(logData.companyName) + '」公司在該商業季度的經理人競選活動。';
      }
      case '經理管理': {
        return '以經理人的身份修改了「' + getCompanyLink(logData.companyName) + '」公司的一些資訊。';
      }
      case '產品發布': {
        return '以經理人的身份為「' + getCompanyLink(logData.companyName) + '」公司發表了一項新產品。';
      }
      case '產品下架': {
        return '以經理人的身份將「' + getCompanyLink(logData.companyName) + '」公司的一項產品給下架了。';
      }
      case '推薦產品': {
        return '向「' + getCompanyLink(logData.companyName) + '」公司的一項產品投了一張推薦票。';
      }
      case '支持紀錄': {
        return '支持' + logData.username[1] + '擔任「' + getCompanyLink(logData.companyName) + '」公司的經理人。';
      }
      case '就任經理': {
        return (
          '在' + logData.message + '商業季度' +
          (logData.amount ? ('以' + logData.amount + '數量的支持股份') : '') +
          '擊敗了所有競爭對手，取代' + logData.username[1] +
          '成為「' + getCompanyLink(logData.companyName) + '」公司的經理人。'
        );
      }
      case '營利分紅': {
        return '得到了來自「' + getCompanyLink(logData.companyName) + '」公司的營利分紅$' + logData.amount + '。';
      }
      case '舉報公司': {
        return '以「' + logData.message + '」理由舉報了「' + getCompanyLink(logData.companyName) + '」公司。';
      }
      case '舉報產品': {
        return '以「' + logData.message + '」理由舉報了「' + getCompanyLink(logData.companyName) + '」公司的一項產品。';
      }
      case '公司撤銷': {
        return '以「' + logData.message + '」理由撤銷了「' + logData.companyName + '」公司。';
      }
      case '取消資格': {
        return '以「' + logData.message + '」理由取消了' + logData.username[1] + '擔任經理人的資格！';
      }
    }
  }
});
