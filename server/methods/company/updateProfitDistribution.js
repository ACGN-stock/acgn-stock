import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { getCurrentSeason } from '/db/dbSeason';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardCompany } from '/common/imports/guards';

Meteor.methods({
  updateProfitDistribution({ companyId, distribution }) {
    check(this.userId, String);
    check(companyId, String);
    check(distribution, {
      managerBonusRatePercent: Match.Integer,
      employeeBonusRatePercent: Match.Integer,
      capitalIncreaseRatePercent: Match.Integer
    });
    updateProfitDistribution({ userId: this.userId, companyId, distribution });

    return true;
  }
});
export function updateProfitDistribution({ userId, companyId, distribution }) {
  debug.log('updateProfitDistribution', { userId, companyId, distribution });

  const user = Meteor.users.findByIdOrThrow(userId);

  const company = dbCompanies.findByIdOrThrow(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      isSeal: 1
    }
  });

  guardCompany(company)
    .checkNotSealed()
    .checkIsManageableByUser(user);

  const { min: minManagerBonusRatePercent, max: maxManagerBonusRatePercent } = Meteor.settings.public.companyProfitDistribution.managerBonusRatePercent;
  const { min: minEmployeeBonusRatePercent, max: maxEmployeeBonusRatePercent } = Meteor.settings.public.companyProfitDistribution.employeeBonusRatePercent;
  const { min: minCapitalIncreaseRatePercent, limit: capitalIncreaseRatePercentLimit } = Meteor.settings.public.companyProfitDistribution.capitalIncreaseRatePercent;
  const { lockTime } = Meteor.settings.public.companyProfitDistribution;

  const { managerBonusRatePercent, employeeBonusRatePercent, capitalIncreaseRatePercent } = distribution;

  if (managerBonusRatePercent < minManagerBonusRatePercent || managerBonusRatePercent > maxManagerBonusRatePercent) {
    throw new Meteor.Error(403, '經理分紅比例超出範圍！');
  }

  if (employeeBonusRatePercent < minEmployeeBonusRatePercent || employeeBonusRatePercent > maxEmployeeBonusRatePercent) {
    throw new Meteor.Error(403, '員工分紅比例超出範圍！');
  }

  const maxCapitalIncreaseRatePercent = capitalIncreaseRatePercentLimit - managerBonusRatePercent - employeeBonusRatePercent;
  if (capitalIncreaseRatePercent < minCapitalIncreaseRatePercent || capitalIncreaseRatePercent > maxCapitalIncreaseRatePercent) {
    throw new Meteor.Error(403, '資本額注入比例超出範圍！');
  }

  const currentSeason = getCurrentSeason();

  if (Date.now() >= currentSeason.endDate.getTime() - lockTime) {
    const lockHours = lockTime / 1000 / 60 / 60;
    throw new Meteor.Error(403, `季度結束前${lockHours}小時不可更改分紅！`);
  }

  dbCompanies.update(companyId, {
    $set: { managerBonusRatePercent, employeeBonusRatePercent, capitalIncreaseRatePercent }
  });
}
limitMethod('updateProfitDistribution');
