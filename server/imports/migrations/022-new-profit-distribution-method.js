import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog } from '/db/dbLog';
import { dbCompanies } from '/db/dbCompanies';

defineMigration({
  version: 22,
  name: 'new profit distribution method',
  async up() {
    // 調整欄位與設定新欄位的預設值
    await dbCompanies.rawCollection().update({}, {
      $rename: {
        seasonalBonusPercent: 'employeeBonusRatePercent'
      },
      $set: {
        managerBonusRatePercent: Meteor.settings.public.companyProfitDistribution.managerBonusRatePercent.default,
        capitalIncreaseRatePercent: Meteor.settings.public.companyProfitDistribution.capitalIncreaseRatePercent.default
      }
    }, { multi: true });

    dbLog.update({ logType: '營利分紅' }, { $rename: { 'data.bonus': 'data.amount' } }, { multi: true });
    dbLog.update({ logType: '推薦回饋', companyId: { $exists: true } }, {
      $set: {
        logType: '營利分紅',
        'data.bonusType': 'employeeProductVotingReward'
      },
      $rename: { 'data.reward': 'data.amount' }
    }, { multi: true });
  }
});
