import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { wrapFunction } from 'meteor/teamgrid:reactive-interval';

import { gradeFactorTable } from '/db/dbCompanies';
import { dbCompanyStones, stonePowerTable, stoneTypeList } from '/db/dbCompanyStones';
import { getCurrentSeason } from '/db/dbSeason';
import { wrapScopeKey } from '/common/imports/utils/wrapScopeKey';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { stoneDisplayName } from '../utils/helpers';
import { paramCompany, paramCompanyId } from './helpers';

inheritedShowLoadingOnSubscribing(Template.companyMiningMachine);

const reactiveTimeToSeasonEnd = wrapFunction(() => {
  return getCurrentSeason().endDate.getTime() - Date.now();
}, 1000);

Template.companyMiningMachine.onCreated(function() {
  this.companyStonesOffset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    this.subscribe('companyMiningMachineInfo', paramCompanyId());
  });

  this.autorunWithIdleSupport(() => {
    this.subscribe('companyStones', {
      companyId: paramCompanyId(),
      offset: this.companyStonesOffset.get()
    });
  });

  this.autorunWithIdleSupport(() => {
    if (Meteor.userId()) {
      this.subscribe('companyCurrentUserPlacedStones', paramCompanyId());
    }
  });
});

Template.companyMiningMachine.helpers({
  isInOperationTime() {
    return reactiveTimeToSeasonEnd() < Meteor.settings.public.miningMachineOperationTime;
  },
  stoneTypeList() {
    return stoneTypeList;
  },
  stoneCount(stoneType) {
    const { miningMachineInfo } = paramCompany();

    if (! miningMachineInfo || ! miningMachineInfo.stoneCount) {
      return 0;
    }

    return miningMachineInfo.stoneCount[stoneType] || 0;
  },
  stonePower(stoneType) {
    return stonePowerTable[stoneType];
  },
  totalMiningPower() {
    const { miningMachineInfo } = paramCompany();

    if (! miningMachineInfo || ! miningMachineInfo.stoneCount) {
      return 0;
    }

    return Object.entries(miningMachineInfo.stoneCount).reduce((sum, [stoneType, count]) => {
      return sum + (stonePowerTable[stoneType] || 0) * count;
    }, 0);
  },
  totalMiningProfit(totalPower) {
    const { grade } = paramCompany();
    const gradeFactor = gradeFactorTable.miningMachine[grade];

    return Math.round(6300 * Math.log10(totalPower + 1) * Math.pow(totalPower + 1, gradeFactor));
  },
  currentUserPlacedStoneType() {
    const companyId = paramCompanyId();
    const userId = Meteor.userId();
    const { stoneType } = dbCompanyStones.findOne({ companyId, userId }) || {};

    return stoneType;
  },
  currentUserAvailableStoneTypeList() {
    const user = Meteor.user();
    if (! user) {
      return [];
    }

    return Object.entries(user.profile.stones)
      .filter(([key, value]) => {
        return stoneTypeList.includes(key) && value > 0;
      })
      .map(([key]) => {
        return key;
      });
  },
  companyStones() {
    return dbCompanyStones.find({ [wrapScopeKey('companyStones')]: 1 }, { sort: { placedAt: -1 } });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfCompanyStones',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.companyStones,
      offset: Template.instance().companyStonesOffset
    };
  }
});

Template.companyMiningMachine.events({
  'submit form[name="placeStoneForm"]'(event, templateInstance) {
    event.preventDefault();

    const companyId = paramCompanyId();
    const stoneType = templateInstance.$('select[name="stoneType"]').val();

    if (! stoneTypeList.includes(stoneType)) {
      return;
    }

    alertDialog.confirm({
      title: '放置石頭',
      message: `確定要放入<span class="text-info">${stoneDisplayName(stoneType)}</span>到挖礦機嗎？`,
      callback: (result) => {
        if (! result) {
          return;
        }

        Meteor.customCall('placeStone', { companyId, stoneType });
      }
    });
  },
  'click [data-action="retrieveStone"]'(event) {
    event.preventDefault();

    const companyId = paramCompanyId();
    const userId = Meteor.userId();
    const { stoneType } = dbCompanyStones.findOne({ companyId, userId }) || {};

    if (! stoneType) {
      return;
    }

    alertDialog.confirm({
      title: '取回石頭',
      message: `確定要從挖礦機取回<span class="text-info">${stoneDisplayName(stoneType)}</span>嗎？`,
      callback: (result) => {
        if (! result) {
          return;
        }

        Meteor.customCall('retrieveStone', { companyId });
      }
    });
  }
});
