import { _ } from 'meteor/underscore';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { debug } from '/server/imports/utils/debug';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbLog } from '/db/dbLog';
import { getCurrentSeason } from '../season/getCurrentSeason';
import { getCurrentArena } from '../arena/getCurrentArena';

// 對全市場所有公司進行經理人選舉
export function electManager() {
  debug.log('electManager');
  console.log('start elect manager...');

  const seasonData = getCurrentSeason();
  const { _id: arenaId } = getCurrentArena();

  const seasonDisplayName = getSeasonDisplayName(seasonData);

  resourceManager.request('electManager', ['elect'], (release) => {
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
      .forEach(({ _id: companyId, manager, candidateList, voteList }) => {
        // TODO 簡化合併以下各種狀況
        switch (candidateList.length) {
          //沒有候選人的狀況下，不進行處理
          case 0: {
            return;
          }
          //只有一位候選人，只有在原經理與現任經理不同的狀況下才需要處理
          case 1: {
            const newManager = candidateList[0];
            if (manager !== newManager) {
              needExecuteBulk = true;
              logBulk.insert({
                logType: '就任經理',
                userId: [newManager],
                companyId: companyId,
                data: { seasonName: seasonDisplayName },
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
              arenaFightersBulk
                .find({ arenaId, companyId })
                .updateOne({ $set: { manager: newManager } });
            }
            break;
          }
          //多位候選人的狀況下
          default: {
            needExecuteBulk = true;
            const directorList = dbDirectors
              .find({ companyId }, {
                fields: {
                  userId: 1,
                  stocks: 1
                },
                disableOplog: true
              })
              .fetch();

            const voteStocksList = _.map(candidateList, (candidate, index) => {
              const voteDirectorList = voteList[index];
              const stocks = _.reduce(voteDirectorList, (stocks, userId) => {
                const directorData = _.findWhere(directorList, {userId});

                return stocks + (directorData ? directorData.stocks : 0);
              }, 0);

              return { userId: candidate, stocks };
            });

            // 第一個得票最高的候選人為新經理人
            const { userId: newManager, stocks: winnerStocks } = _.max(voteStocksList, ({ stocks }) => {
              return stocks;
            });

            logBulk.insert({
              logType: '就任經理',
              userId: [newManager, manager],
              companyId,
              data: {
                seasonName: seasonDisplayName,
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
                  voteList: [ [] ]
                }
              });
            arenaFightersBulk
              .find({ arenaId, companyId })
              .updateOne({ $set: { manager: newManager } });
            break;
          }
        }
      });

    release();

    if (needExecuteBulk) {
      logBulk.execute();
      companiesBulk.execute();
      arenaFightersBulk.execute();
    }
  });
}

// 取得商業季度顯示名稱
function getSeasonDisplayName(seasonData) {
  return `${convertDateToText(seasonData.beginDate)}~${convertDateToText(seasonData.endDate)}`;
}

function convertDateToText(date) {
  const dateInTimeZone = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 * -1);

  return (
    dateInTimeZone.getFullYear() + '/' +
    padZero(dateInTimeZone.getMonth() + 1) + '/' +
    padZero(dateInTimeZone.getDate()) + ' ' +
    padZero(dateInTimeZone.getHours()) + ':' +
    padZero(dateInTimeZone.getMinutes())
  );
}

function padZero(n) {
  if (n < 10) {
    return '0' + n;
  }
  else {
    return n;
  }
}
