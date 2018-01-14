import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { dbVariables } from '/db/dbVariables';
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
  miningMachineSaintStoneLimit() {
    return Meteor.settings.public.miningMachineSaintStoneLimit;
  },
  productProfitFactor() {
    return Meteor.settings.public.productProfitFactor;
  },
  productFinalSaleHours() {
    return Math.floor(Meteor.settings.public.productFinalSaleTime / 1000 / 60 / 60);
  },
  systemProductVotingReward() {
    return Meteor.settings.public.systemProductVotingReward;
  },
  employeeProductVotingRewardPercentage() {
    return Meteor.settings.public.employeeProductVotingRewardFactor * 100;
  }
});
