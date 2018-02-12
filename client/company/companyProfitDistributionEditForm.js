import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

import { getCurrentSeason } from '/db/dbSeason';
import { inheritUtilForm, handleInputChange as baseHandleInputChange } from '../utils/form';
import { paramCompany, paramCompanyId } from './helpers';

const modelFields = ['managerBonusRatePercent', 'employeeBonusRatePercent', 'capitalIncreaseRatePercent'];

inheritUtilForm(Template.companyProfitDistributionEditForm);

Template.companyProfitDistributionEditForm.events({
  reset(event, templateInstance) {
    event.preventDefault();
    templateInstance.model.set(_.pick(paramCompany(), ...modelFields));
  }
});

Template.companyProfitDistributionEditForm.onCreated(function() {
  this.validateModel = (model) => {
    const error = {};

    const { min: minManagerBonusRatePercent, max: maxManagerBonusRatePercent } = Meteor.settings.public.companyProfitDistribution.managerBonusRatePercent;
    const { min: minEmployeeBonusRatePercent, max: maxEmployeeBonusRatePercent } = Meteor.settings.public.companyProfitDistribution.employeeBonusRatePercent;
    const { min: minCapitalIncreaseRatePercent } = Meteor.settings.public.companyProfitDistribution.capitalIncreaseRatePercent;
    const maxCapitalIncreaseRatePercent = getMaxCapitalIncreaseRatePercent(model);

    if (! model.managerBonusRatePercent) {
      error.managerBonusRatePercent = '經理分紅比例不得為空！';
    }
    else if (model.managerBonusRatePercent < minManagerBonusRatePercent || model.managerBonusRatePercent > maxManagerBonusRatePercent) {
      error.managerBonusRatePercent = '經理分紅比例超出範圍！';
    }

    if (! model.employeeBonusRatePercent) {
      error.employeeBonusRatePercent = '員工分紅比例不得為空！';
    }
    else if (model.employeeBonusRatePercent < minEmployeeBonusRatePercent || model.employeeBonusRatePercent > maxEmployeeBonusRatePercent) {
      error.employeeBonusRatePercent = '員工分紅比例超出範圍！';
    }

    if (! model.capitalIncreaseRatePercent) {
      error.capitalIncreaseRatePercent = '資本額注入比例不得為空！';
    }
    else if (model.capitalIncreaseRatePercent < minCapitalIncreaseRatePercent || model.capitalIncreaseRatePercent > maxCapitalIncreaseRatePercent) {
      error.capitalIncreaseRatePercent = '資本額注入比例超出範圍！';
    }

    if (_.size(error) > 0) {
      return error;
    }
  };

  this.saveModel = (model) => {
    Meteor.customCall('updateProfitDistribution', { companyId: paramCompanyId(), distribution: model });
  };

  this.handleInputChange = (...args) => {
    baseHandleInputChange.call(this, ...args);

    const model = this.model.get();

    const { min: minManagerBonusRatePercent, max: maxManagerBonusRatePercent } = Meteor.settings.public.companyProfitDistribution.managerBonusRatePercent;
    const { min: minEmployeeBonusRatePercent, max: maxEmployeeBonusRatePercent } = Meteor.settings.public.companyProfitDistribution.employeeBonusRatePercent;
    const { min: minCapitalIncreaseRatePercent } = Meteor.settings.public.companyProfitDistribution.capitalIncreaseRatePercent;

    model.managerBonusRatePercent = Math.min(Math.max(parseInt(model.managerBonusRatePercent, 10), minManagerBonusRatePercent), maxManagerBonusRatePercent);
    model.employeeBonusRatePercent = Math.min(Math.max(parseInt(model.employeeBonusRatePercent, 10), minEmployeeBonusRatePercent), maxEmployeeBonusRatePercent);

    const maxCapitalIncreaseRatePercent = getMaxCapitalIncreaseRatePercent(model);
    model.capitalIncreaseRatePercent = Math.min(Math.max(parseInt(model.capitalIncreaseRatePercent, 10), minCapitalIncreaseRatePercent), maxCapitalIncreaseRatePercent);

    this.model.set(model);

    Object.entries(model).forEach(([key, value]) => {
      this.$(`[name=${key}]`).val(value);
    });
  };
});

Template.companyProfitDistributionEditForm.onRendered(function() {
  this.autorun(() => {
    this.model.set(_.pick(paramCompany(), ...modelFields));
  });
});

Template.companyProfitDistributionEditForm.helpers({
  minCapitalIncreaseRatePercent() {
    return Meteor.settings.public.companyProfitDistribution.capitalIncreaseRatePercent.min;
  },
  maxCapitalIncreaseRatePercent() {
    return getMaxCapitalIncreaseRatePercent(Template.instance().model.get());
  },
  minManagerBonusRatePercent() {
    return Meteor.settings.public.companyProfitDistribution.managerBonusRatePercent.min;
  },
  maxManagerBonusRatePercent() {
    return Meteor.settings.public.companyProfitDistribution.managerBonusRatePercent.max;
  },
  minEmployeeBonusRatePercent() {
    return Meteor.settings.public.companyProfitDistribution.employeeBonusRatePercent.min;
  },
  maxEmployeeBonusRatePercent() {
    return Meteor.settings.public.companyProfitDistribution.employeeBonusRatePercent.max;
  },
  lockTimeDisabledAttr() {
    return isInLockTime() ? { disabled: true } : '';
  },
  isInLockTime() {
    return isInLockTime();
  }
});

function isInLockTime() {
  const { lockTime } = Meteor.settings.public.companyProfitDistribution;
  const { endDate } = getCurrentSeason();

  return Date.now() >= endDate.getTime() - lockTime;
}

function getMaxCapitalIncreaseRatePercent({ managerBonusRatePercent, employeeBonusRatePercent }) {
  const { min, limit } = Meteor.settings.public.companyProfitDistribution.capitalIncreaseRatePercent;

  return Math.max(limit - managerBonusRatePercent - employeeBonusRatePercent, min);
}
