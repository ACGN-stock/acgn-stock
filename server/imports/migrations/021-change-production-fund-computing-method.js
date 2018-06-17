import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog } from '/db/dbLog';
import { dbCompanies } from '/db/dbCompanies';

defineMigration({
  version: 21,
  name: 'change production fund computing method',
  async up() {
    // 將生產資金欄位重新命名為基礎生產資金
    await dbCompanies.rawCollection().update({}, { $rename: { productionFund: 'baseProductionFund' } }, { multi: true });

    // 歸零所有公司的基礎生產資金
    dbCompanies.update({}, { $set: { baseProductionFund: 0 } }, { multi: true });

    // 更新所有公司的基礎生產資金為最近一季營利額之 10%
    const baseProductionFundMap = {};

    dbLog
      .aggregate([ {
        $match: { logType: '公司營利' }
      }, {
        $sort: { createdAt: -1 }
      }, {
        $group: {
          _id: '$companyId',
          previousSeasonProfit: { $first: '$data.profit' }
        }
      } ])
      .forEach(({ _id: companyId, previousSeasonProfit }) => {
        baseProductionFundMap[companyId] = Math.round(previousSeasonProfit * 0.1);
      });

    if (! _.isEmpty(baseProductionFundMap)) {
      const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
      Object.entries(baseProductionFundMap).forEach(([companyId, baseProductionFund]) => {
        companyBulk.find({ _id: companyId }).updateOne({ $set: { baseProductionFund } });
      });
      Meteor.wrapAsync(companyBulk.execute, companyBulk)();
    }
  }
});
