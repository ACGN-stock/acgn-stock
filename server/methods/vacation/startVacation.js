import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbCompanies } from '/db/dbCompanies';
import { dbFoundations } from '/db/dbFoundations';
import { dbOrders } from '/db/dbOrders';
import { dbTaxes } from '/db/dbTaxes';
import { dbEmployees } from '/db/dbEmployees';
import { dbRound } from '/db/dbRound';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  startVacation() {
    check(this.userId, String);
    startVacation(this.userId);

    return true;
  }
});
export function startVacation(userId) {
  debug.log('startVacation', userId);

  const user = Meteor.users.findOne({ _id: userId });
  if (! user) {
    throw new Meteor.Error(404, `找不到識別碼為 ${userId} 的使用者！`);
  }

  const { isInVacation, lastVacationEndDate } = user.profile;

  if (isInVacation) {
    throw new Meteor.Error(403, '您已經處於渡假狀態！');
  }

  const lastRoundData = dbRound.findOne({}, { sort: { beginDate: -1 } });

  if (lastRoundData.endDate.getTime() - Date.now() < Meteor.settings.public.seasonTime * 2) {
    throw new Meteor.Error(403, '賽季結束前兩週禁止渡假！');
  }

  const timeSinceLastVacationEnd = Date.now() - (lastVacationEndDate || 0);
  if (timeSinceLastVacationEnd <= Meteor.settings.public.minIntervalTimeBetweenVacations) {
    throw new Meteor.Error(403, '距離上次收假時間過短，無法再次渡假！');
  }

  if (dbCompanies.find({ manager: userId, isSeal: false }).count() || dbFoundations.find({ manager: userId }).count()) {
    throw new Meteor.Error(403, '您有擔任公司經理職務，無法進行渡假！');
  }

  if (dbCompanies.find({ candidateList: userId, isSeal: false }).count()) {
    throw new Meteor.Error(403, '您正在競選公司經理人，無法進行渡假！');
  }

  if (dbCompanies.find({ chairman: userId, isSeal: false }).count()) {
    throw new Meteor.Error(403, '您有擔任公司董事長，無法進行渡假！');
  }

  if (dbOrders.find({ userId }).count()) {
    throw new Meteor.Error(403, '您有進行中的買賣單，全部撤回後才能進行渡假！');
  }

  if (dbTaxes.find({ userId }).count()) {
    throw new Meteor.Error(403, '您現在有稅單未繳，全部結清後才能進行渡假！');
  }

  if (dbEmployees.find({ userId, employed: false, resigned: false }).count()) {
    throw new Meteor.Error(403, '您有登記為公司的儲備員工，無法進行渡假！');
  }

  Meteor.users.update({ _id: userId }, {
    $set: {
      'profile.isInVacation': true,
      'profile.isEndingVacation': false,
      'profile.lastVacationStartDate': new Date()
    }
  });
}
