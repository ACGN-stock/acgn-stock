import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { paramCompany } from './helpers';

Template.editCompanySwitchContentProfitDistribution.helpers({
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
  }
});
