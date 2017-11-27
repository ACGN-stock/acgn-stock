import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbSeason } from '/db/dbSeason';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  updateSeasonalBonus(companyId, percentage) {
    check(this.userId, String);
    check(companyId, String);
    check(percentage, Match.Integer);
    updateSeasonalBonus(Meteor.user(), companyId, percentage);

    return true;
  }
});
export function updateSeasonalBonus(user, companyId, percentage) {
  debug.log('updateSeasonalBonus', {user, companyId, percentage});
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      isSeal: 1
    }
  });

  if (companyData.manager !== '!none' && user._id !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  if (percentage < Meteor.settings.public.minimumSeasonalBonusPercent || percentage > Meteor.settings.public.maximumSeasonalBonusPercent) {
    throw new Meteor.Error(403, '不正確的分紅設定！');
  }

  const seasonData = dbSeason
    .findOne({}, {
      sort: {
        beginDate: -1
      }
    });
  if (! seasonData) {
    throw new Meteor.Error(500, '商業季度尚未開始！');
  }
  if (Date.now() >= seasonData.endDate.getTime() - Meteor.settings.public.announceBonusTime) {
    const hour = Meteor.settings.public.announceBonusTime / 1000 / 60 / 60;
    throw new Meteor.Error(403, `季度結束前${hour}小時不可更改分紅！`);
  }

  dbCompanies.update(companyId, {
    $set: {
      seasonalBonusPercent: percentage
    }
  });
}
limitMethod('updateSeasonalBonus');
