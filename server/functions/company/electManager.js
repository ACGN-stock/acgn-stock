import { _ } from 'meteor/underscore';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { debug } from '/server/imports/utils/debug';
import { getCurrentArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbLog } from '/db/dbLog';
import { getCurrentSeason } from '/db/dbSeason';

// 選舉新的經理人與計算最萌亂鬥大賽所有報名者的攻擊次序
export function electManager() {
  console.log('start elect manager...');
  debug.log('electManager');
  const currentSeason = getCurrentSeason();
  const currentArena = getCurrentArena();
  const arenaId = currentArena ? currentArena._id : null;
  const electMessage = `${convertDateToText(currentSeason.beginDate)}～${convertDateToText(currentSeason.endDate)}`;

  resourceManager.request('electManager', ['elect'], (release) => {
    if (dbCompanies.find({ isSeal: false }).count() > 0) {
      const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
      const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
      const arenaFightersBulk = dbArenaFighters.rawCollection().initializeUnorderedBulkOp();
      let needExecuteBulk = false;

      dbCompanies
        .find({ isSeal: false }, {
          fields: {
            _id: 1,
            manager: 1,
            candidateList: 1,
            voteList: 1
          },
          disableOplog: true
        })
        .forEach((companyData) => {
          const companyId = companyData._id;
          switch (companyData.candidateList.length) {
            // 沒有候選人的狀況下，不進行處理
            case 0: {
              return false;
            }
            // 只有一位候選人，只有在原經理與現任經理不同的狀況下才需要處理
            case 1: {
              const newManager = companyData.candidateList[0];
              if (companyData.manager !== newManager) {
                needExecuteBulk = true;
                logBulk.insert({
                  logType: '就任經理',
                  userId: [newManager],
                  companyId: companyId,
                  data: { seasonName: electMessage },
                  createdAt: new Date()
                });
                companiesBulk
                  .find({ _id: companyId })
                  .updateOne({
                    $set: {
                      manager: newManager,
                      candidateList: [newManager],
                      voteList: [ [] ]
                    }
                  });
                if (arenaId) {
                  arenaFightersBulk.find({ arenaId, companyId }).updateOne({ $set: { manager: newManager } });
                }
              }
              break;
            }
            // 多位候選人的狀況下
            default: {
              needExecuteBulk = true;
              const voteList = companyData.voteList;
              const directorList = dbDirectors.find({ companyId }, { fields: { userId: 1, stocks: 1 }, disableOplog: true }).fetch();

              const voteStocksList = _.map(companyData.candidateList, (candidate, index) => {
                const voteDirectorList = voteList[index];
                const stocks = _.reduce(voteDirectorList, (stocks, userId) => {
                  const directorData = _.findWhere(directorList, { userId });

                  return stocks + (directorData ? directorData.stocks : 0);
                }, 0);

                return {
                  userId: candidate,
                  stocks: stocks
                };
              });
              const sortedVoteStocksList = _.sortBy(voteStocksList, 'stocks');
              const winnerStocks = _.last(sortedVoteStocksList).stocks;
              const winnerData = _.findWhere(voteStocksList, { stocks: winnerStocks });
              logBulk.insert({
                logType: '就任經理',
                userId: [winnerData.userId, companyData.manager],
                companyId,
                data: {
                  seasonName: electMessage,
                  stocks: winnerData.stocks
                },
                createdAt: new Date()
              });
              companiesBulk
                .find({ _id: companyId })
                .updateOne({
                  $set: {
                    manager: winnerData.userId,
                    candidateList: [winnerData.userId],
                    voteList: [ [] ]
                  }
                });
              if (arenaId) {
                arenaFightersBulk.find({ arenaId, companyId }).updateOne({ $set: { manager: winnerData.userId } });
              }
              break;
            }
          }
        });

      release();

      if (needExecuteBulk) {
        logBulk.execute();
        companiesBulk.execute();

        if (arenaId) {
          arenaFightersBulk.execute();
        }
      }
    }
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

function padZero(n) {
  return n < 10 ? `0${n}` : `${n}`;
}
