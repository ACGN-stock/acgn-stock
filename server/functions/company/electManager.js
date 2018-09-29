import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { debug } from '/server/imports/utils/debug';
import { getCurrentArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbLog } from '/db/dbLog';
import { getCurrentSeason } from '/db/dbSeason';
import { padZero } from '/common/imports/utils/formatTimeUtils';

function computeUserActiveMap() {
  const nowTime = Date.now();

  return Meteor.users
    .find({}, { 'status.lastLogin.date': 1 })
    .fetch()
    .reduce((obj, { _id: userId, status }) => {
      const lastLoginDate = (status && status.lastLogin && status.lastLogin.date) || new Date(0);
      obj[userId] = nowTime - lastLoginDate.getTime() <= Meteor.settings.public.electManagerLastLoginTimeThreshold;

      return obj;
    }, {});
}

// 選舉新的經理人
export function electManager() {
  console.log('start elect manager...');
  debug.log('electManager');

  if (dbCompanies.find({ isSeal: false }).count() === 0) {
    return;
  }

  const currentSeason = getCurrentSeason();
  const currentArena = getCurrentArena();
  const arenaId = currentArena ? currentArena._id : null;
  const electMessage = `${convertDateToText(currentSeason.beginDate)}～${convertDateToText(currentSeason.endDate)}`;

  const userActiveMap = computeUserActiveMap();

  resourceManager.request('electManager', ['elect'], (release) => {
    // 各公司的選舉結果
    const electionResults = [];

    dbCompanies
      .find({
        isSeal: false,
        candidateList: { $not: { $size: 0 } }
      }, {
        fields: {
          _id: 1,
          manager: 1,
          candidateList: 1,
          voteList: 1
        },
        disableOplog: true
      })
      .fetch()
      .forEach(({ _id: companyId, manager: oldManager, candidateList, voteList }) => {
        const directorStocksMap = dbDirectors
          .find({ companyId }, { fields: { userId: 1, stocks: 1 } })
          .fetch()
          .reduce((obj, { userId, stocks }) => {
            obj[userId] = stocks;

            return obj;
          }, {});

        const voteStocksList = _.map(candidateList, (candidate, index) => {
          const voters = voteList[index];
          const stocks = _.reduce(voters, (totalStocks, voter) => {
            return totalStocks + (directorStocksMap[voter] || 0);
          }, 0);

          return { userId: candidate, stocks, voters };
        });

        const winnerStocks = _.max(_.pluck(voteStocksList, 'stocks'));
        const { userId: newManager, voters: winnerVoters } = _.findWhere(voteStocksList, { stocks: winnerStocks });

        // 經理若活躍玩家，則來自活躍玩家的支持將繼續，否則清空支持
        const newVoters = userActiveMap[newManager] ? winnerVoters.filter((voter) => {
          return userActiveMap[voter];
        }) : [];

        electionResults.push({ companyId, oldManager, newManager, winnerStocks, newVoters });
      });

    if (! _.isEmpty(electionResults)) {
      const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
      const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();

      electionResults.forEach(({ companyId, oldManager, newManager, winnerStocks, newVoters }) => {
        logBulk.insert({
          logType: '就任經理',
          userId: [newManager, oldManager],
          companyId,
          data: {
            seasonName: electMessage,
            stocks: winnerStocks
          },
          createdAt: new Date()
        });

        companiesBulk
          .find({ _id: companyId })
          .updateOne({
            $set: {
              manager: newManager,
              candidateList: [newManager],
              voteList: [newVoters]
            }
          });
      });

      Meteor.wrapAsync(logBulk.execute, logBulk)();
      Meteor.wrapAsync(companiesBulk.execute, companiesBulk)();

      // 有亂鬥大賽資料時，更新亂鬥的決策者為新經理
      if (arenaId) {
        const arenaFightersBulk = dbArenaFighters.rawCollection().initializeUnorderedBulkOp();
        electionResults.forEach(({ companyId, newManager }) => {
          arenaFightersBulk.find({ arenaId, companyId }).updateOne({ $set: { manager: newManager } });
        });
        Meteor.wrapAsync(arenaFightersBulk.execute, arenaFightersBulk)();
      }
    }

    release();
  });
}

function convertDateToText(date) {
  const dateInTimeZone = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 * -1);

  return (
    `${dateInTimeZone.getFullYear()}/${
      padZero(dateInTimeZone.getMonth() + 1)}/${
      padZero(dateInTimeZone.getDate())} ${
      padZero(dateInTimeZone.getHours())}:${
      padZero(dateInTimeZone.getMinutes())}`
  );
}
