'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';
import { changeChairmanTitle } from '../utils/methods';
import { accountInfoCommonHelpers, paramUserId, paramUser, isCurrentUser } from './helpers';

inheritedShowLoadingOnSubscribing(Template.accountInfo);

Template.accountInfo.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const userId = paramUserId();
    if (userId) {
      this.subscribe('accountInfo', userId);
    }
  });

  this.autorunWithIdleSupport(() => {
    const userId = paramUserId();
    if (userId) {
      this.subscribe('employeeListByUser', userId);
    }
  });

  this.autorun(() => {
    const user = paramUser();
    if (user) {
      DocHead.setTitle(Meteor.settings.public.websiteName + ' - 「' + user.profile.name + '」帳號資訊');
    }
  });
});
// 是否展開面板
const rDisplayPanelList = new ReactiveVar([]);
Template.accountInfo.helpers({
  ...accountInfoCommonHelpers,
  isDisplayPanel(panelType) {
    return _.contains(rDisplayPanelList.get(), panelType);
  }
});
Template.accountInfo.events({
  'click [data-toggle-panel]'(event) {
    event.preventDefault();
    const panelType = $(event.currentTarget).attr('data-toggle-panel');
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
  ...accountInfoCommonHelpers,
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
  showUnregisterEmployee() {
    const userId = paramUserId();
    const employed = false;

    return isCurrentUser() && dbEmployees.findOne({ userId, employed });
  },
  isBaned(type) {
    return _.contains(this.profile.ban, type);
  },
  isInVacation() {
    return this.profile.isInVacation;
  },
  isEndingVacation() {
    return this.profile.isEndingVacation;
  }
});

Template.accountInfoBasic.events({
  'click [data-action="fscAnnouncement"]'(event) {
    event.preventDefault();
    const accuseUser = paramUser();
    alertDialog.dialog({
      type: 'prompt',
      title: `金管會通告 - ${accuseUser.profile.name}`,
      message: `請輸入要通告的訊息：`,
      callback: (message) => {
        if (message) {
          const userIds = [accuseUser._id];
          Meteor.customCall('fscAnnouncement', { userIds, message });
        }
      }
    });
  },
  'click [data-action="accuse"]'(event) {
    event.preventDefault();
    const accuseUser = paramUser();
    alertDialog.dialog({
      type: 'prompt',
      title: '舉報違規 - ' + accuseUser.profile.name,
      message: `請輸入您要舉報的內容：`,
      callback: (message) => {
        if (message) {
          const userId = accuseUser._id;
          Meteor.customCall('accuseUser', userId, message);
        }
      }
    });
  },
  'click [data-ban]'(event) {
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
    const accuseUserData = paramUser();
    alertDialog.dialog({
      type: 'prompt',
      title: '違規處理 - ' + accuseUserData.profile.name + ' - ' + banActionText,
      message: `請輸入處理事由：`,
      callback: (message) => {
        if (message) {
          const userId = accuseUserData._id;
          Meteor.customCall('banUser', { userId, message, banType });
        }
      }
    });
  },
  'click [data-action="forfeitUserMoney"]'(event) {
    event.preventDefault();
    const accuseUserData = paramUser();
    alertDialog.dialog({
      type: 'prompt',
      title: '課以罰金 - ' + accuseUserData.profile.name,
      message: `請輸入處理事由：`,
      callback: (reason) => {
        if (reason) {
          alertDialog.dialog({
            type: 'prompt',
            title: '課以罰金 - ' + accuseUserData.profile.name,
            message: `請輸入罰金數額：`,
            inputType: 'number',
            customSetting: `min="0"`,
            callback: (amount) => {
              amount = parseInt(amount, 10);
              if (amount && amount >= 0) {
                const userId = accuseUserData._id;
                Meteor.customCall('forfeitUserMoney', { userId, reason, amount });
              }
            }
          });
        }
      }
    });
  },
  'click [data-action="returnForfeitedUserMoney"]'(event) {
    event.preventDefault();
    const accuseUserData = paramUser();
    alertDialog.dialog({
      type: 'prompt',
      title: '退還罰金 - ' + accuseUserData.profile.name,
      message: `請輸入處理事由：`,
      callback: (reason) => {
        if (reason) {
          alertDialog.dialog({
            type: 'prompt',
            title: '退還罰金 - ' + accuseUserData.profile.name,
            message: `請輸入退還金額：`,
            inputType: 'number',
            customSetting: `min="0"`,
            callback: (amount) => {
              amount = parseInt(amount, 10);
              if (amount && amount > 0) {
                const userId = accuseUserData._id;
                Meteor.customCall('forfeitUserMoney', { userId, reason, amount: -amount });
              }
            }
          });
        }
      }
    });
  },
  'click [data-action="confiscateStocks"]'(event) {
    event.preventDefault();
    const accuseUserData = paramUser();
    alertDialog.dialog({
      type: 'prompt',
      title: '沒收股份 - ' + accuseUserData.profile.name,
      message: `請輸入處理事由：`,
      callback: (message) => {
        if (message) {
          const userId = accuseUserData._id;
          Meteor.customCall('confiscateStocks', { userId, message });
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
    alertDialog.confirm({
      message: '確定要開始渡假嗎？',
      callback: (result) => {
        if (result) {
          Meteor.customCall('startVacation', (err) => {
            if (! err) {
              alertDialog.alert('您已進入渡假模式！');
            }
          });
        }
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

export const companyTitleView = new ReactiveVar('chairman');
Template.companyTitleTab.helpers({
  getClass(type) {
    if (companyTitleView.get() === type) {
      return 'nav-link active';
    }
    else {
      return 'nav-link';
    }
  }
});
Template.companyTitleTab.events({
  'click [data-type]'(event) {
    event.preventDefault();
    const $target = $(event.currentTarget);
    companyTitleView.set($target.data('type'));
  }
});

Template.accountCompanyTitle.helpers({
  viewType(type) {
    return (companyTitleView.get() === type);
  }
});

export const chairmanOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.chairmanTitleList);
Template.chairmanTitleList.onCreated(function() {
  chairmanOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = paramUserId();
    if (userId) {
      this.subscribe('accountChairmanTitle', userId, chairmanOffset.get());
    }
  });
});
Template.chairmanTitleList.helpers({
  ...accountInfoCommonHelpers,
  titleList() {
    return dbCompanies
      .find({
        chairman: this._id,
        isSeal: false
      },
      {
        limit: 10
      });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfChairmanTitle',
      dataNumberPerPage: 10,
      offset: chairmanOffset
    };
  }
});
Template.chairmanTitleList.events({
  'click [data-action="changeChairmanTitle"]'() {
    const companyData = this;
    changeChairmanTitle(companyData);
  }
});

export const managerOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.managerTitleList);
Template.managerTitleList.onCreated(function() {
  managerOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = paramUserId();
    if (userId) {
      this.subscribe('accountManagerTitle', userId, managerOffset.get());
    }
  });
});
Template.managerTitleList.helpers({
  titleList() {
    return dbCompanies
      .find({
        manager: this._id,
        isSeal: false
      },
      {
        limit: 10
      });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfManagerTitle',
      dataNumberPerPage: 10,
      offset: managerOffset
    };
  }
});

Template.employeeTitleList.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = paramUserId();
    if (userId) {
      this.subscribe('accounEmployeeTitle', userId);
    }
  });
});
Template.employeeTitleList.helpers({
  employment() {
    const userId = paramUserId();

    return dbEmployees.find({ userId }, { sort: { employed: -1 } });
  },
  isSeal(companyId) {
    const companyData = dbCompanies.findOne(companyId);

    return companyData ? companyData.isSeal : false;
  }
});
