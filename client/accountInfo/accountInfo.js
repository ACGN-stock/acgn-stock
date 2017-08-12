'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbLog } from '../../db/dbLog';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { getCompanyLink } from '../utils/helpers';

inheritedShowLoadingOnSubscribing(Template.accountInfo);
export const rSearchUsername = new ReactiveVar('');
export const ownStocksOffset = new ReactiveVar(0);
export const logOffset = new ReactiveVar(0);
Template.accountInfo.onCreated(function() {
  this.autorun(() => {
    const username = rSearchUsername.get();
    if (username) {
      this.subscribe('accountInfo', username);
    }
  });
  ownStocksOffset.set(0);
  this.autorun(() => {
    const username = rSearchUsername.get();
    if (username) {
      this.subscribe('accountOwnStocks', username, ownStocksOffset.get());
    }
  });
  logOffset.set(0);
  this.autorun(() => {
    const username = rSearchUsername.get();
    if (username) {
      this.subscribe('accountInfoLog', username, logOffset.get());
    }
  });
});

Template.accountInfoSearchForm.onRendered(function() {
  this.$searchUsername = this.$('[name="searchUsername"]');
});
Template.accountInfoSearchForm.helpers({
  isInLookMode(lookMode) {
    if (rSearchUsername.get() === '') {
      return 'other';
    }
    else {
      const user = Meteor.user();
      const username = user ? user.username : '';

      return (rSearchUsername.get() === username ? 'self' : 'other') === lookMode;
    }
  },
  searchUsername() {
    const user = Meteor.user();
    const username = user ? user.username : '';
    const searchUsername = rSearchUsername.get();

    return (searchUsername === username) ? '' : searchUsername;
  }
});
Template.accountInfoSearchForm.events({
  'change [name="lookMode"][value="self"]'() {
    const user = Meteor.user();
    if (user) {
      const username = user.username;
      const path = FlowRouter.path('accountInfo', {username});
      FlowRouter.go(path);
    }
  },
  submit(event, templateInstance) {
    event.preventDefault();
    const username = templateInstance.$searchUsername.val();
    const path = FlowRouter.path('accountInfo', {username});
    FlowRouter.go(path);
  }
});

Template.accountInfoBasic.helpers({
  lookUser() {
    const username = rSearchUsername.get();

    if (username) {
      return Meteor.users.findOne({username});
    }
    else {
      return null;
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

Template.accountInfoOwnStocks.helpers({
  directorList() {
    const username = rSearchUsername.get();

    return dbDirectors.find({username});
  }
});
Template.accountInfoOwnStocks.helpers({
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountOwnStocks',
      dataNumberPerPage: 10,
      offset: ownStocksOffset
    };
  }
});

Template.accountInfoLogList.helpers({
  logList() {
    return dbLog.find(
      {
        username: {
          $in: [rSearchUsername.get(), '!all']
        }
      },
      {
        sort: {
          createdAt: -1
        }
      }
    );
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountInfoLog',
      dataNumberPerPage: 30,
      offset: logOffset
    };
  }
});

Template.accountInfoLog.helpers({
  getLogDescriptionHtml(logData) {
    const user = Meteor.user();
    const username = (user && user.username);
    switch (logData.logType) {
      case '免費得石': {
        return '因為「' + logData.message + '」的理由獲得了' + logData.amount + '顆聖晶石！。';
      }
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
        if (logData.username[0] === username) {
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
      case '交易紀錄': {
        if (logData.username[0] === username) {
          return '以$' + logData.price + '的單價向' + (logData.username[1] || ('「' + getCompanyLink(logData.companyName) + '」公司')) + '購買了' + logData.amount + '數量的「' + logData.companyName + '」公司股票！';
        }
        else {
          return '以$' + logData.price + '的單價向' + logData.username[0] + '賣出了' + logData.amount + '數量的「' + getCompanyLink(logData.companyName) + '」公司股票！';
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
      case '推薦產品': {
        return '向「' + getCompanyLink(logData.companyName) + '」公司的一項產品投了一張推薦票，使其獲得了$' + logData.price + '的營利額。';
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
