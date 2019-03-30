import { ReactiveVar } from 'meteor/reactive-var';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbEmployees } from '/db/dbEmployees';
import { getCurrentSeason } from '/db/dbSeason';
import { changeChairmanTitle, confiscateCompanyProfit, markCompanyIllegal, returnCompanyProfit, toggleFavorite, unmarkCompanyIllegal } from '/client/utils/methods';
import { currencyFormat } from '/client/utils/helpers';
import { isHeadlessChrome } from '/client/utils/isHeadlessChrome';
import { alertDialog } from '/client/layout/alertDialog';
import { paramCompany, paramCompanyId } from './helpers';

const TAGS_LIMIT = 3;

Template.companyDetailNormalContent.onCreated(function() {
  this.showAllTags = new ReactiveVar(isHeadlessChrome());
  this.autorunWithIdleSupport(() => {
    const companyId = paramCompanyId();
    if (companyId) {
      this.subscribe('employeeListByCompany', companyId);
    }
  });
});

Template.companyDetailNormalContent.helpers({
  company() {
    return paramCompany();
  },
  visibleTags() {
    const { tags } = paramCompany();

    if (! tags) {
      return [];
    }

    return Template.instance().showAllTags.get() ? tags : tags.slice(0, TAGS_LIMIT);
  },
  showAllTags() {
    const { tags } = paramCompany();

    if (! tags) {
      return false;
    }

    return tags.length <= TAGS_LIMIT || Template.instance().showAllTags.get();
  },
  pathForReportCompanyViolation() {
    return FlowRouter.path('reportViolation', null, { type: 'company', id: paramCompanyId() });
  },
  pathForEditCompany() {
    return FlowRouter.path('editCompany', { companyId: paramCompanyId() });
  },
  canUpdateSalary() {
    const { endDate: seasonEndDate } = getCurrentSeason() || {};

    return seasonEndDate && Date.now() < seasonEndDate.getTime() - Meteor.settings.public.announceSalaryTime;
  },
  isEmployee() {
    const userId = Meteor.userId();
    const companyId = paramCompanyId();
    const employed = false;
    const resigned = false;

    return dbEmployees.find({ companyId, userId, employed, resigned }).count() > 0;
  }
});

Template.companyDetailNormalContent.events({
  'click [data-action="showAllTags"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.showAllTags.set(true);
  },
  'click [data-toggle-employ]'(event) {
    event.preventDefault();
    const userId = Meteor.userId();
    const companyId = $(event.currentTarget).attr('data-toggle-employ');
    const employed = false;
    const resigned = false;
    const employData = dbEmployees.findOne({ companyId, userId, employed, resigned });
    if (employData) {
      Meteor.customCall('unregisterEmployee', function(err) {
        if (! err) {
          alertDialog.alert('您已取消報名！');
        }
      });
    }
    else {
      const message = '報名後將會被其他公司移出儲備員工名單，您確定要報名嗎？';
      alertDialog.confirm({
        message,
        callback: (result) => {
          if (result) {
            Meteor.customCall('registerEmployee', companyId, function(err) {
              if (! err) {
                alertDialog.alert('您已報名成功！');
              }
            });
          }
        }
      });
    }
  },
  'click [data-toggle-favorite]'(event) {
    event.preventDefault();
    const companyId = $(event.currentTarget).attr('data-toggle-favorite');
    toggleFavorite(companyId);
  },
  'click [data-action="changeChairmanTitle"]'(event) {
    event.preventDefault();
    changeChairmanTitle(paramCompany());
  },
  'click [data-action="updateSalary"]'(event) {
    event.preventDefault();
    const companyId = paramCompanyId();
    const minSalary = Meteor.settings.public.minimumCompanySalaryPerDay;
    const maxSalary = Meteor.settings.public.maximumCompanySalaryPerDay;
    const message = `請輸入下季員工薪資：(${currencyFormat(minSalary)}~${currencyFormat(maxSalary)})`;

    alertDialog.prompt({
      message,
      inputType: 'number',
      customSetting: `min="${minSalary}" max="${maxSalary}"`,
      callback: (salary) => {
        if (salary && salary.length > 0) {
          salary = parseInt(salary, 10);
          if (isNaN(salary) || salary < minSalary || salary > maxSalary) {
            alertDialog.alert('不正確的薪資設定！');

            return false;
          }

          Meteor.customCall('updateNextSeasonSalary', companyId, salary);
        }
      }
    });
  },
  'click [data-action="setEmployeeBonusRate"]'(event) {
    event.preventDefault();
    const companyId = paramCompanyId();
    const minBonus = Meteor.settings.public.minimumSeasonalBonusPercent;
    const maxBonus = Meteor.settings.public.maximumSeasonalBonusPercent;
    const message = `請輸入本季員工分紅占營收百分比：(${minBonus}~${maxBonus})`;

    alertDialog.prompt({
      message,
      inputType: 'number',
      customSetting: `min="${minBonus}" max="${maxBonus}"`,
      callback: (percentage) => {
        if (percentage && percentage.length > 0) {
          percentage = parseInt(percentage, 10);
          if (isNaN(percentage) || percentage < minBonus || percentage > maxBonus) {
            alertDialog.alert('不正確的分紅設定！');

            return false;
          }

          Meteor.customCall('setEmployeeBonusRate', companyId, percentage);
        }
      }
    });
  },
  'click [data-action="resignManager"]'(event) {
    event.preventDefault();
    const companyId = paramCompanyId();
    const { companyName } = paramCompany();
    const checkCompanyName = companyName.replace(/\s/g, '');
    const message = `你確定要辭去「${companyName}」的經理人職務？\n請輸入「${checkCompanyName}」以表示確定。`;

    alertDialog.prompt({
      message,
      callback: (confirmMessage) => {
        if (confirmMessage === checkCompanyName) {
          Meteor.customCall('resignManager', companyId);
        }
      }
    });
  },
  'click [data-action="markCompanyIllegal"]'(event) {
    event.preventDefault();
    markCompanyIllegal(paramCompanyId());
  },
  'click [data-action="unmarkCompanyIllegal"]'(event) {
    event.preventDefault();
    unmarkCompanyIllegal(paramCompanyId());
  },
  'click [data-action="confiscateCompanyProfit"]'(event) {
    event.preventDefault();
    confiscateCompanyProfit(paramCompany());
  },
  'click [data-action="returnCompanyProfit"]'(event) {
    event.preventDefault();
    returnCompanyProfit(paramCompany());
  }
});
