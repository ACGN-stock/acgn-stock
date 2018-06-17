import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog } from '/db/dbLog';
import { dbCompanies } from '/db/dbCompanies';
import { dbRankCompanyCapital } from '/db/dbRankCompanyCapital';

defineMigration({
  version: 15,
  name: 'company capital system',
  async up() {
    await Promise.all([
      dbCompanies.rawCollection().createIndex({ capital: -1 }, { partialFilterExpression: { isSeal: false } }),
      dbCompanies.rawCollection().createIndex({ grade: -1 }, { partialFilterExpression: { isSeal: false } }),
      dbRankCompanyCapital.rawCollection().createIndex({ season: 1 })
    ]);

    if (dbCompanies.find().count() === 0) {
      return;
    }

    // 設定所有既存公司之評級為 D
    dbCompanies.update({}, { $set: { grade: 'D' } }, { multi: true });

    // 初始資本額 = 募得資金 = 初始配股 * 初始股價
    const initialCapitalMap = dbLog
      .aggregate([ {
        $match: {
          logType: { $in: ['創立得股', '創立成功'] }
        }
      }, {
        $group: {
          _id: '$companyId',
          stocks: { $sum: '$data.stocks' },
          price: { $sum: '$data.price' }
        }
      }, {
        $project: {
          initialCapital: { $multiply: ['$stocks', '$price'] }
        }
      } ])
      .reduce((obj, { _id, initialCapital }) => {
        obj[_id] = initialCapital;

        return obj;
      }, {});

    // 增加資本額 = Σ(釋股數量 * 釋股成交價格)
    const capitalIncreaseMap = dbLog
      .aggregate([ {
        $match: {
          logType: '交易紀錄',
          userId: { $size: 1 }
        }
      }, {
        $group: {
          _id: '$companyId',
          capitalIncrease: { $sum: { $multiply: ['$data.price', '$data.amount'] } }
        }
      } ])
      .reduce((obj, { _id, capitalIncrease }) => {
        obj[_id] = capitalIncrease;

        return obj;
      }, {});

    const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();

    const companyIds = Object.keys(initialCapitalMap);
    companyIds.forEach((companyId) => {
      const initialCapital = initialCapitalMap[companyId] || 0;
      const capitalIncrease = capitalIncreaseMap[companyId] || 0;
      const capital = initialCapital + capitalIncrease;

      companiesBulk.find({ _id: companyId }).updateOne({ $set: { capital } });
    });

    Meteor.wrapAsync(companiesBulk.execute, companiesBulk)();
  }
});
