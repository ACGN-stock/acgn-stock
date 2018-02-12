import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { getCurrentSeason } from '/db/dbSeason';
import { paramCompany } from './helpers';

Template.companyProfitDistributionPanel.helpers({
  company() {
    return paramCompany();
  },
  incomeTaxRatePercent() {
    return Meteor.settings.public.companyProfitDistribution.incomeTaxRatePercent;
  },
  employeeProductVotingRewardRatePercent() {
    return Meteor.settings.public.companyProfitDistribution.employeeProductVotingRewardRatePercent;
  },
  directorBonusRatePercent() {
    const { incomeTaxRatePercent, employeeProductVotingRewardRatePercent } = Meteor.settings.public.companyProfitDistribution;
    const { managerBonusRatePercent, employeeBonusRatePercent, capitalIncreaseRatePercent } = paramCompany();

    return 100 - incomeTaxRatePercent - capitalIncreaseRatePercent - managerBonusRatePercent - employeeBonusRatePercent - employeeProductVotingRewardRatePercent;
  },
  isNotInLockTime() {
    const { lockTime } = Meteor.settings.public.companyProfitDistribution;
    const { endDate } = getCurrentSeason();

    return Date.now() < endDate.getTime() - lockTime;
  }
});
