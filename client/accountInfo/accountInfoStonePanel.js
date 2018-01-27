import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbCompanyStones, stoneTypeList, stonePowerTable } from '/db/dbCompanyStones';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { stoneDisplayName } from '../utils/helpers';
import { accountInfoCommonHelpers, paramUserId, paramUser } from './helpers';

inheritedShowLoadingOnSubscribing(Template.accountInfoStonePanel);

Template.accountInfoStonePanel.onCreated(function() {
  this.placedStonesOffset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const userId = paramUserId();
    if (userId) {
      const offset = this.placedStonesOffset.get();
      this.subscribe('userPlacedStones', { userId, offset });
    }
  });
});

Template.accountInfoStonePanel.helpers({
  ...accountInfoCommonHelpers,
  placedStones() {
    return dbCompanyStones.find({ userId: paramUserId() });
  },
  stoneTypeList() {
    return stoneTypeList;
  },
  stonePower(stoneType) {
    return stonePowerTable[stoneType];
  },
  buyableStoneTypeList() {
    return Object.keys(Meteor.settings.public.stonePrice);
  },
  stonePrice(stoneType) {
    return Meteor.settings.public.stonePrice[stoneType];
  },
  userStoneCount(stoneType) {
    return paramUser().profile.stones[stoneType] || 0;
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfUserPlacedStones',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.userPlacedStones,
      offset: Template.instance().placedStonesOffset
    };
  }
});

Template.accountInfoStonePanel.events({
  'click [data-action="buyStone"]'(event, templateInstance) {
    event.preventDefault();

    const currentUser = Meteor.user();
    const stoneType = templateInstance.$(event.currentTarget).attr('data-stone-type');
    const stonePrice = Meteor.settings.public.stonePrice[stoneType];
    const maxAmount = Math.floor(currentUser.profile.money / stonePrice);

    if (maxAmount <= 0) {
      alertDialog.alert('您的金錢不足！');

      return;
    }

    alertDialog.dialog({
      type: 'prompt',
      title: `購買石頭 - ${stoneDisplayName(stoneType)}`,
      message: `請輸入數量(1~${maxAmount})：`,
      inputType: 'number',
      customSetting: `min="1" max="${maxAmount}"`,
      callback: (result) => {
        if (! result) {
          return;
        }

        const amount = Math.floor(parseInt(result, 10));
        if (Number.isNaN(amount) || amount < 1 || amount > maxAmount) {
          alertDialog.alert('不正確的數量！');

          return;
        }

        const cost = amount * stonePrice;
        if (currentUser.profile.money < cost) {
          alertDialog.alert('您的金錢不足！');

          return;
        }

        Meteor.customCall('buyStone', { stoneType, amount });
      }
    });
  }
});
