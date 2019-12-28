import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { getCurrentPageFullTitle } from '/routes';
import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';
import { dbVips } from '/db/dbVips';
import { roleDisplayName, getManageableRoles } from '/db/users';
import { setPrerenderTitleReady } from '/client/utils/prerenderReady';

import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';
import { changeChairmanTitle, confiscateUserMoney, sendFscNotice, banUser, confiscateAllUserStocks, returnUserMoney, forceCancelUserOrders, clearUserAbout } from '../utils/methods';
import { accountInfoCommonHelpers, paramUserId, paramUser, isCurrentUser } from './helpers';

inheritedShowLoadingOnSubscribing(Template.accountInfo);

Template.accountInfo.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const userId = paramUserId();

    if (! userId) {
      const currentUserId = Meteor.userId();
      if (currentUserId) {
        FlowRouter.setParams({ userId: currentUserId });
      }

      return;
    }

    this.subscribe('accountInfo', userId);
    this.subscribe('employeeListByUser', userId);
  });

  this.autorun(() => {
    const user = paramUser();
    if (user) {
      DocHead.setTitle(getCurrentPageFullTitle(user.profile.name));
      setPrerenderTitleReady(true);
    }
    else {
      setPrerenderTitleReady(false);
    }
  });
});
// 是否展開面板
const rDisplayPanelList = new ReactiveVar([]);
Template.accountInfo.helpers({
  ...accountInfoCommonHelpers,
  isDisplayPanel(panelType) {
    return _.contains(rDisplayPanelList.get(), panelType);
  },
  currentUserHasManageableRoles() {
    return getManageableRoles(Meteor.user());
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
  roleDisplayName,
  showValidateType() {
    switch (this.profile.validateType) {
      case 'Google': {
        return `【Google帳號】${this.services.google.email}`;
      }
      case 'PTT': {
        return `【PTT帳號】${this.username}`;
      }
      case 'Bahamut': {
        return `【巴哈姆特帳號】${this.username.replace('?', '')}`;
      }
    }
  },
  showUnregisterEmployee() {
    const userId = paramUserId();
    const employed = false;

    return isCurrentUser() && dbEmployees.findOne({ userId, employed });
  },
  isBanned(type) {
    return _.contains(this.profile.ban, type);
  },
  isInVacation() {
    return this.profile.isInVacation;
  },
  isEndingVacation() {
    return this.profile.isEndingVacation;
  },
  pathForReportUserViolation() {
    return FlowRouter.path('reportViolation', null, { type: 'user', id: paramUserId() });
  },
  pathForEditAccount() {
    return FlowRouter.path('editAccount', { userId: paramUserId() });
  }
});

Template.accountInfoBasic.events({
  'click [data-action="sendFscNotice"]'(event) {
    event.preventDefault();
    sendFscNotice({ userIds: [paramUserId()] });
  },
  'click [data-ban]'(event) {
    event.preventDefault();
    const banType = $(event.currentTarget).attr('data-ban');
    banUser(paramUser(), banType);
  },
  'click [data-action="clearUserAbout"]'(event) {
    event.preventDefault();
    clearUserAbout(paramUser());
  },
  'click [data-action="confiscateUserMoney"]'(event) {
    event.preventDefault();
    confiscateUserMoney(paramUser());
  },
  'click [data-action="returnUserMoney"]'(event) {
    event.preventDefault();
    returnUserMoney(paramUser());
  },
  'click [data-action="forceCancelUserOrders"]'(event) {
    event.preventDefault();
    forceCancelUserOrders(paramUser());
  },
  'click [data-action="confiscateAllUserStocks"]'(event) {
    event.preventDefault();
    confiscateAllUserStocks(paramUser());
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

const companyTitleView = new ReactiveVar('chairman');
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

const chairmanOffset = new ReactiveVar(0);
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

const managerOffset = new ReactiveVar(0);
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

const founderOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.founderTitleList);
Template.founderTitleList.onCreated(function() {
  founderOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = paramUserId();
    if (userId) {
      this.subscribe('accountFounderTitle', userId, founderOffset.get());
    }
  });
});
Template.founderTitleList.helpers({
  titleList() {
    return dbCompanies
      .find({
        founder: this._id,
        isSeal: false
      },
      {
        limit: 10
      });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfFounderTitle',
      dataNumberPerPage: 10,
      offset: founderOffset
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

Template.vipTitleList.onCreated(function() {
  this.offset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const userId = paramUserId();
    if (userId) {
      this.subscribe('accountVipTitle', userId, this.offset.get());
    }
  });
});
Template.vipTitleList.helpers({
  vips() {
    return dbVips.find({ userId: paramUserId }, { sort: { level: -1 } });
  },
  getTitle(vip) {
    return `Level ${vip.level} VIP`;
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfVipTitle',
      dataNumberPerPage: 10,
      offset: Template.instance().offset
    };
  }
});
