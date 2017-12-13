import { Meteor } from 'meteor/meteor';

import { eventScheduler } from '/server/imports/utils/eventScheduler';
import { dbArena } from '/db/dbArena';
import { dbCompanies } from '/db/dbCompanies';
import { dbEmployees } from '/db/dbEmployees';
import { dbProducts } from '/db/dbProducts';
import { dbSeason } from '/db/dbSeason';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';
import { getCurrentArena } from '../arena/getCurrentArena';

//產生新的商業季度
export function generateNewSeason() {
  debug.log('generateNewSeason');
  const beginDate = new Date();
  const endDate = new Date(beginDate.setMinutes(0, 0, 0) + Meteor.settings.public.seasonTime);
  const userCount = Meteor.users.find().count();
  const productCount = dbProducts.find({ overdue: 0 }).count();
  const companiesCount = dbCompanies.find({ isSeal: false }).count();
  //本季度每個使用者可以得到多少推薦票
  const vote = Math.max(Math.floor(Math.log10(companiesCount) * 18), 0);
  const votePrice = Meteor.settings.public.votePricePerTicket;
  const seasonId = dbSeason.insert({ beginDate, endDate, userCount, companiesCount, productCount, votePrice });

  // 排程經理人選舉事件
  const electTime = endDate.getTime() - Meteor.settings.public.electManagerTime;
  eventScheduler.scheduleEvent('season.electManager', electTime);

  // 重設使用者推薦票
  Meteor.users.update({}, { $set: { 'profile.vote': vote } }, { multi: true });

  // 過季產品下架
  dbProducts.update({ overdue: 1 }, { $set: { overdue: 2 } }, { multi: true });

  // 當季產品上架
  dbProducts.update({ overdue: 0 }, { $set: { overdue: 1, seasonId } }, { multi: true });

  //雇用所有上季報名的使用者
  dbEmployees.update({
    resigned: false,
    registerAt: { $lt: new Date(endDate.getTime() - Meteor.settings.public.seasonTime) }
  }, { $set: { employed: true } }, { multi: true });

  //更新所有公司員工薪資
  dbCompanies.find().forEach((companyData) => {
    dbCompanies.update(companyData, { $set: { salary: companyData.nextSeasonSalary } });
  });

  const arenaCounter = dbVariables.get('arenaCounter') || 0;
  //若上一個商業季度為最萌亂鬥大賽的舉辦季度，則產生新的arena Data，並排程相關事件
  if (arenaCounter <= 0) {
    const arenaEndDate = new Date(endDate.getTime() + Meteor.settings.public.seasonTime * Meteor.settings.public.arenaIntervalSeasonNumber);
    const joinEndDate = new Date(arenaEndDate.getTime() - Meteor.settings.public.electManagerTime); // TODO 與經理選舉設定獨立
    dbArena.insert({ beginDate, endDate: arenaEndDate, joinEndDate });
    dbVariables.set('arenaCounter', Meteor.settings.public.arenaIntervalSeasonNumber);
    eventScheduler.scheduleEvent('arena.joinEnded', joinEndDate);
  }
  else {
    //若下一個商業季度為最萌亂鬥大賽的舉辦季度，則以新產生的商業季度結束時間與選舉時間更新最萌亂鬥大賽的時間，以糾正季度更換時的時間偏差
    if (arenaCounter === 1) {
      const { _id: arenaId } = getCurrentArena();
      const joinEndDate = new Date(electTime); // TODO 與經理選舉設定獨立
      dbArena.update(arenaId, { $set: { endDate, joinEndDate } });
      eventScheduler.scheduleEvent('arena.joinEnded', joinEndDate);
    }
    dbVariables.set('arenaCounter', arenaCounter - 1);
  }

  return seasonId;
}
