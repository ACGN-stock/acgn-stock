import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { gradeNameList, gradeProportionMap } from '/db/dbCompanies';
import { dbVariables } from '/db/dbVariables';
import { VIP_LEVEL5_MAX_COUNT } from '/db/dbVips';
import { importantAccuseLogTypeList } from '/db/dbLog';
import { stonePowerTable } from '/db/dbCompanyStones';

Template.tutorial.events({
  'click .card-header.pointer'(event) {
    $(event.currentTarget)
      .next('.collapse')
      .toggleClass('show');
  }
});
Template.tutorial.helpers({
  importantAccuseLogTypeList() {
    return importantAccuseLogTypeList;
  },
  fscRuleURL() {
    return dbVariables.get('fscRuleURL');
  },
  newUserBirthStoneCount() {
    return Meteor.settings.public.newUserBirthStones;
  },
  stonePower(stoneType) {
    return stonePowerTable[stoneType];
  },
  stonePrice(stoneType) {
    return Meteor.settings.public.stonePrice[stoneType];
  },
  miningMachineOperationHours() {
    return Math.floor(Meteor.settings.public.miningMachineOperationTime / 1000 / 60 / 60);
  },
  productFinalSaleHours() {
    return Math.floor(Meteor.settings.public.productFinalSaleTime / 1000 / 60 / 60);
  },
  systemProductVotingReward() {
    return Meteor.settings.public.systemProductVotingReward;
  },
  employeeProductVotingRewardPercentage() {
    return Meteor.settings.public.employeeProductVotingRewardFactor * 100;
  },
  productVoucherAmount() {
    return Meteor.settings.public.productVoucherAmount;
  },
  productRebateDivisorAmount() {
    return Meteor.settings.public.productRebates.divisorAmount;
  },
  productRebateDeliverAmount() {
    return Meteor.settings.public.productRebates.deliverAmount;
  },
  vipLevelDownChancePercent() {
    return Math.round(Meteor.settings.public.vipLevelDownChance * 100);
  },
  vipPreviousSeasonScoreWeightPercent() {
    return Math.round(Meteor.settings.public.vipPreviousSeasonScoreWeight * 100);
  },
  vipLevel5MaxCount() {
    return VIP_LEVEL5_MAX_COUNT;
  },
  vipParameters() {
    return Object.entries(Meteor.settings.public.vipParameters).map(([level, parameters]) => {
      return {
        level,
        productProfitFactorPercent: Math.round(parameters.productProfitFactor * 100),
        stockBonusFactorPercent: Math.round(parameters.stockBonusFactor * 100)
      };
    });
  },
  companyGradeList() {
    return gradeNameList;
  },
  getCompanyGradeProportionPercentage(grade) {
    return Math.round(gradeProportionMap[grade] * 100);
  }
});
