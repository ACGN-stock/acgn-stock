import { Meteor } from 'meteor/meteor';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbAdvertising } from '/db/dbAdvertising';
import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbDirectors } from '/db/dbDirectors';
import { dbEmployees } from '/db/dbEmployees';
import { dbFoundations } from '/db/dbFoundations';
import { dbLog, accuseLogTypeList } from '/db/dbLog';
import { dbOrders } from '/db/dbOrders';
import { dbPrice } from '/db/dbPrice';
import { dbProductLike } from '/db/dbProductLike';
import { dbProducts } from '/db/dbProducts';
import { dbResourceLock } from '/db/dbResourceLock';
import { dbTaxes } from '/db/dbTaxes';
import { dbUserArchive } from '/db/dbUserArchive';
import { dbVariables } from '/db/dbVariables';
import { debug } from '/server/imports/utils/debug';
import { getCurrentSeason } from '../season/getCurrentSeason';
import { cancelAllOrder } from '../order/cancelAllOrder';
import { startArenaFight } from '../arena/startArenaFight';
import { giveBonusByStocksFromProfit } from '../company/giveBonusByStocksFromProfit';
import { generateRankAndTaxesData } from '../season/generateRankAndTaxesData';
import { generateNewSeason } from '../season/generateNewSeason';
import { generateNewRound } from './generateNewRound';

//賽季結束工作
export function doRoundWorks() {
  const currentSeasonData = getCurrentSeason();
  debug.log('doRoundWorks', currentSeasonData);
  //避免執行時間過長導致重複進行賽季結算
  if (dbResourceLock.findOne('season')) {
    return false;
  }
  console.info(new Date().toLocaleString() + ': doRoundWorks');
  resourceManager.request('doRoundWorks', ['season'], (release) => {
    //當賽季結束時，取消所有尚未交易完畢的訂單
    cancelAllOrder();
    //若arenaCounter為0，則舉辦最萌亂鬥大賽
    const arenaCounter = dbVariables.get('arenaCounter');
    if (arenaCounter === 0) {
      startArenaFight();
    }
    //當賽季結束時，結算所有公司的營利額並按照股權分給股東。
    giveBonusByStocksFromProfit();
    //為所有公司與使用者進行排名結算
    generateRankAndTaxesData(currentSeasonData);
    //移除所有廣告
    dbAdvertising.remove({});
    //保管所有未被查封的公司的狀態
    dbCompanies
      .find({}, {
        fields: {
          _id: 1,
          companyName: 1,
          tags: 1,
          pictureSmall: 1,
          pictureBig: 1,
          description: 1,
          isSeal: 1
        }
      })
      .forEach((companyData) => {
        if (companyData.isSeal) {
          dbCompanyArchive.remove(companyData._id);
        }
        else {
          dbCompanyArchive.upsert({ _id: companyData._id }, {
            $set: {
              status: 'archived',
              name: companyData.companyName,
              tags: companyData.tags,
              pictureSmall: companyData.pictureSmall,
              pictureBig: companyData.pictureBig,
              description: companyData.description,
              invest: []
            }
          });
        }
      });
    //重置所有保管庫資料
    dbCompanyArchive.update({}, {
      $set: {
        status: 'archived',
        invest: []
      }
    }, { multi: true });
    //移除所有公司資料
    dbCompanies.remove({});
    //移除所有股份資料
    dbDirectors.remove({});
    //移除所有員工資料
    dbEmployees.remove({});
    //移除所有新創資料
    dbFoundations.remove({});
    //移除所有除了金管會相關以外的紀錄資料
    dbLog.remove({ logType: { $nin: accuseLogTypeList } });
    //移除所有訂單資料
    dbOrders.remove({});
    //移除所有價格資料
    dbPrice.remove({});
    //移除所有產品資料
    dbProductLike.remove({});
    dbProducts.remove({});
    //移除所有稅金料
    dbTaxes.remove({});
    //保管所有使用者的狀態
    Meteor.users.find({}).forEach((userData) => {
      dbUserArchive.upsert({ _id: userData._id }, {
        $set: {
          status: 'archived',
          name: userData.profile.name,
          validateType: userData.profile.validateType,
          isAdmin: userData.profile.isAdmin,
          stone: userData.profile.stone,
          ban: userData.profile.ban
        }
      });
    });
    //移除所有使用者資料
    Meteor.users.remove({});
    //產生新的賽季
    generateNewRound();
    //產生新的商業季度
    generateNewSeason();
    release();
  });
}
