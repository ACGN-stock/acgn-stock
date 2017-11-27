'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbLog, accuseLogTypeList } from '/db/dbLog';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbEmployees } from '/db/dbEmployees';
import { dbTaxes } from '/db/dbTaxes';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';

inheritedShowLoadingOnSubscribing(Template.accountInfo);
Template.accountInfo.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      this.subscribe('accountInfo', userId);
    }
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      this.subscribe('employeeListByUser', userId);
    }
  });
  this.autorun(() => {
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      const user = Meteor.users.findOne(userId);
      if (user) {
        DocHead.setTitle(Meteor.settings.public.websiteName + ' - 「' + user.profile.name + '」帳號資訊');
      }
    }
  });
});
//是否展開面板
const rDisplayPanelList = new ReactiveVar([]);
Template.accountInfo.helpers({
  lookUser() {
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      return Meteor.users.findOne(userId);
    }
    else {
      return null;
    }
  },
  isDisplayPanel(panelType) {
    return _.contains(rDisplayPanelList.get(), panelType);
  }
});
Template.accountInfo.events({
  'click [data-toggle-panel]'(event) {
    event.preventDefault();
    const $emitter = $(event.currentTarget);
    const panelType = $emitter.attr('data-toggle-panel');
    const displayPanelList = rDisplayPanelList.get();
    if (_.contains(displayPanelList, panelType)) {
      rDisplayPanelList.set(_.without(displayPanelList, panelType));
    }
    else {
      displayPanelList.push(panelType);
      rDisplayPanelList.set(displayPanelList);
    }
  }
});

Template.accountInfoBasic.helpers({
  showValidateType() {
    switch (this.profile.validateType) {
      case 'Google': {
        return '【Google帳號】' + this.services.google.email;
      }
      case 'PTT': {
        return '【PTT帳號】' + this.username;
      }
      case 'Bahamut': {
        return '【巴哈姆特帳號】' + this.username.replace('?', '');
      }
    }
  },
  manageCompanies() {
    return dbCompanies
      .find({
        manager: this._id
      });
  },
  employment() {
    const userId = FlowRouter.getParam('userId');
    const employed = true;

    return dbEmployees.findOne({userId, employed});
  },
  nextSeasonEmployment() {
    const userId = FlowRouter.getParam('userId');
    const employed = false;

    return dbEmployees.findOne({userId, employed});
  },
  showUnregisterEmployee() {
    const userId = FlowRouter.getParam('userId');
    const employed = false;

    return userId === Meteor.userId() && dbEmployees.findOne({userId, employed});
  },
  isBaned(type) {
    return _.contains(this.profile.ban, type);
  },
  isInVacation() {
    return this.profile.isInVacation;
  },
  isEndingVacation() {
    return this.profile.isEndingVacation;
  },
  isCurrentUser() { // TODO 和 tax 那邊合併
    const user = Meteor.user();
    if (user && user._id === FlowRouter.getParam('userId')) {
      return true;
    }

    return false;
  }
});
Template.accountInfoBasic.events({
  'click [data-action="fscAnnouncement"]'(event, templateInstance) {
    event.preventDefault();
    const accuseUser = templateInstance.data;
    alertDialog.dialog({
      type: 'prompt',
      title: '金管會通告 - 輸入通知訊息',
      message: `請輸入要通告的訊息：`,
      callback: function(message) {
        if (message) {
          const userId = [accuseUser._id];
          Meteor.customCall('fscAnnouncement', userId, message);
        }
      }
    });
  },
  'click [data-action="accuse"]'(event, templateInstance) {
    event.preventDefault();
    const accuseUser = templateInstance.data;
    alertDialog.dialog({
      type: 'prompt',
      title: '舉報違規 - ' + accuseUser.profile.name,
      message: `請輸入您要舉報的內容：`,
      callback: function(message) {
        if (message) {
          const userId = accuseUser._id;
          Meteor.customCall('accuseUser', userId, message);
        }
      }
    });
  },
  'click [data-ban]'(event, templateInstance) {
    event.preventDefault();
    const banType = $(event.currentTarget).attr('data-ban');
    let banActionText;
    switch (banType) {
      case 'accuse': {
        banActionText = '禁止舉報違規';
        break;
      }
      case 'deal': {
        banActionText = '禁止投資下單';
        break;
      }
      case 'chat': {
        banActionText = '禁止聊天發言';
        break;
      }
      case 'advertise': {
        banActionText = '禁止廣告宣傳';
        break;
      }
      case 'manager': {
        banActionText = '禁止擔任經理';
        break;
      }
    }
    const accuseUserData = templateInstance.data;
    alertDialog.dialog({
      type: 'prompt',
      title: '違規處理 - ' + accuseUserData.profile.name + ' - ' + banActionText,
      message: `請輸入處理事由：`,
      callback: function(message) {
        if (message) {
          const userId = accuseUserData._id;
          Meteor.customCall('banUser', {userId, message, banType});
        }
      }
    });
  },
  'click [data-action="forfeit"]'(event, templateInstance) {
    event.preventDefault();
    const accuseUserData = templateInstance.data;
    alertDialog.dialog({
      type: 'prompt',
      title: '課以罰金 - ' + accuseUserData.profile.name,
      message: `請輸入處理事由：`,
      callback: function(message) {
        if (message) {
          alertDialog.dialog({
            type: 'prompt',
            title: '課以罰金 - ' + accuseUserData.profile.name,
            message: `請輸入罰金數額：`,
            callback: function(amount) {
              amount = parseInt(amount, 10);
              if (amount && amount >= 0) {
                const userId = accuseUserData._id;
                Meteor.customCall('forfeit', {userId, message, amount});
              }
            }
          });
        }
      }
    });
  },
  'click [data-action="returnForfeit"]'(event, templateInstance) {
    event.preventDefault();
    const accuseUserData = templateInstance.data;
    alertDialog.dialog({
      type: 'prompt',
      title: '退還罰金 - ' + accuseUserData.profile.name,
      message: `請輸入處理事由：`,
      callback: function(message) {
        if (message) {
          alertDialog.dialog({
            type: 'prompt',
            title: '退還罰金 - ' + accuseUserData.profile.name,
            message: `請輸入退還金額：`,
            callback: function(amount) {
              amount = parseInt(amount, 10);
              if (amount && amount > 0) {
                const userId = accuseUserData._id;
                amount *= -1;
                Meteor.customCall('forfeit', {userId, message, amount});
              }
            }
          });
        }
      }
    });
  },
  'click [data-action="confiscateStocks"]'(event, templateInstance) {
    event.preventDefault();
    const accuseUserData = templateInstance.data;
    alertDialog.dialog({
      type: 'prompt',
      title: '沒收股份 - ' + accuseUserData.profile.name,
      message: `請輸入處理事由：`,
      callback: function(message) {
        if (message) {
          const userId = accuseUserData._id;
          Meteor.customCall('confiscateStocks', {userId, message});
        }
      }
    });
  },
  'click [data-action="unregisterEmployee"]'(event) {
    event.preventDefault();
    Meteor.customCall('unregisterEmployee');
    // FIXME 底下改成 customCall 的 callback
    alertDialog.alert('您已取消報名！');
  },
  'click [data-action="startVacation"]'(event) {
    event.preventDefault();
    alertDialog.confirm('確定要開始渡假嗎？', (result) => {
      if (result) {
        Meteor.customCall('startVacation', (err) => {
          if (! err) {
            alertDialog.alert('您已進入渡假模式！');
          }
        });
      }
    });
  },
  'click [data-action="toggleEndingVacation"]'(event) {
    event.preventDefault();
    Meteor.customCall('toggleEndingVacation', function(err, result) {
      if (! err) {
        alertDialog.alert(result ? '您已送出收假請求！' : '您已取消收假請求！');
      }
    });
  }
});

export const taxesOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.accountInfoTaxList);
Template.accountInfoTaxList.onCreated(function() {
  taxesOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      this.subscribe('accountInfoTax', userId, taxesOffset.get());
    }
  });
});
Template.accountInfoTaxList.helpers({
  isCurrentUser() {
    const user = Meteor.user();
    if (user && user._id === FlowRouter.getParam('userId')) {
      return true;
    }

    return false;
  },
  taxesList() {
    const userId = FlowRouter.getParam('userId');

    return dbTaxes.find({userId}, {
      limit: 10,
      sort: {
        expireDate: 1
      }
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountInfoTax',
      dataNumberPerPage: 10,
      offset: taxesOffset
    };
  }
});
Template.accountInfoTaxList.events({
  'click [data-pay]'(event) {
    const taxId = new Mongo.ObjectID($(event.currentTarget).attr('data-pay'));
    const taxData = dbTaxes.findOne(taxId);
    if (taxData) {
      const user = Meteor.user();
      const totalNeedPay = taxData.tax + taxData.zombie + taxData.fine - taxData.paid;
      const maxPayMoney = Math.min(user.profile.money, totalNeedPay);
      if (maxPayMoney < 1) {
        alertDialog.alert('您的金錢不足以繳納稅金！');
      }
      alertDialog.dialog({
        type: 'prompt',
        title: '繳納稅金',
        message: `請輸入您要繳納的金額：(1~${maxPayMoney})`,
        callback: function(amount) {
          amount = parseInt(amount, 10);
          if (amount) {
            Meteor.customCall('payTax', taxId, amount);
          }
        }
      });
    }
  }
});

export const ownStocksOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.accountInfoOwnStockList);
Template.accountInfoOwnStockList.onCreated(function() {
  ownStocksOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      this.subscribe('accountOwnStocks', userId, ownStocksOffset.get());
    }
  });
});
Template.accountInfoOwnStockList.helpers({
  directorList() {
    const userId = FlowRouter.getParam('userId');

    return dbDirectors.find({userId}, {
      limit: 10
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountOwnStocks',
      dataNumberPerPage: 10,
      offset: ownStocksOffset
    };
  }
});


export const accountLogViewerMode = new ReactiveVar('accuse');
Template.accountLogViewer.helpers({
  onlyViewAccuse() {
    return accountLogViewerMode.get() === 'accuse';
  }
});

export const accuseOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.accountAccuseLogList);
Template.accountAccuseLogList.onCreated(function() {
  accuseOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      this.subscribe('accountAccuseLog', userId, accuseOffset.get());
    }
  });
});
Template.accountAccuseLogList.helpers({
  accuseList() {
    const userId = FlowRouter.getParam('userId');

    return dbLog.find(
      {
        userId: userId,
        logType: {
          $in: accuseLogTypeList
        }
      },
      {
        sort: {
          createdAt: -1
        },
        limit: 10
      }
    );
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountAccuseLog',
      dataNumberPerPage: 10,
      offset: accuseOffset
    };
  }
});
Template.accountAccuseLogList.events({
  'click button'(event) {
    event.preventDefault();
    accountLogViewerMode.set('all');
  }
});

export const logOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.accountInfoLogList);
Template.accountInfoLogList.onCreated(function() {
  logOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = FlowRouter.getParam('userId');
    if (userId) {
      this.subscribe('accountInfoLog', userId, logOffset.get());
    }
  });
});
Template.accountInfoLogList.helpers({
  logList() {
    const userId = FlowRouter.getParam('userId');

    return dbLog.find(
      {
        userId: {
          $in: [userId, '!all']
        },
        logType: {
          $ne: '聊天發言'
        }
      },
      {
        sort: {
          createdAt: -1
        },
        limit: 30
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
Template.accountInfoLogList.events({
  'click button'(event) {
    event.preventDefault();
    accountLogViewerMode.set('accuse');
  }
});
