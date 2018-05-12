import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbCompanies, gradeFactorTable } from '/db/dbCompanies';
import { dbCompanyStones, stonePowerTable } from '/db/dbCompanyStones';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

// 對全股市公司結算挖礦機營利
export function generateMiningProfits() {
  debug.log('generateMiningProfits');

  const companyProfitIncreaseMap = {};

  dbCompanies
    .find({ isSeal: false }, { _id: 1, grade: 1 })
    .forEach(({ _id: companyId, grade }) => {
      const totalPower = dbCompanyStones
        .find({ companyId }, { _id: 0, userId: 1, stoneType: 1 })
        .fetch()
        .reduce((sum, { stoneType }) => {
          return sum + (stonePowerTable[stoneType] || 0);
        }, 0);
      const gradeFactor = gradeFactorTable.miningMachine[grade] || 0;
      const profitIncrease = Math.round(6300 * Math.log10(totalPower + 1) * Math.pow(totalPower + 1, gradeFactor));

      if (profitIncrease > 0) {
        companyProfitIncreaseMap[companyId] = profitIncrease;
      }
    });

  if (! _.isEmpty(companyProfitIncreaseMap)) {
    const nowDate = new Date();
    const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    const logSchema = dbLog.simpleSchema();

    Object.entries(companyProfitIncreaseMap).forEach(([companyId, profitIncrease]) => {
      companyBulk.find({ _id: companyId }).updateOne({ $inc: { profit: profitIncrease } });

      const logData = logSchema.clean({
        logType: '礦機營利',
        companyId,
        data: { profit: profitIncrease },
        createdAt: nowDate
      });
      logSchema.validate(logData);

      logBulk.insert(logData);
    });

    Meteor.wrapAsync(companyBulk.execute).call(companyBulk);
    Meteor.wrapAsync(logBulk.execute).call(logBulk);
  }

  cleanUpStones();
}

function cleanUpStones() {
  // 移除消耗掉的彩虹石碎片
  dbCompanyStones.remove({ stoneType: 'rainbowFragment' });

  // 轉換彩虹石為彩虹石碎片
  dbCompanyStones.update({ stoneType: 'rainbow' }, { $set: { stoneType: 'rainbowFragment' } }, { multi: true });
}
