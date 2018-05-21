import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbArena } from '/db/dbArena';
import { dbArenaFighters, getAttributeNumber } from '/db/dbArenaFighters';
import { dbCompanies } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  decideArenaStrategy(companyId, strategyData) {
    check(this.userId, String);
    check(companyId, String);
    check(strategyData, {
      spCost: Match.Integer,
      attackSequence: [Match.Integer],
      normalManner: [String],
      specialManner: [String]
    });
    const user = Meteor.user();
    decideArenaStrategy({ user, companyId, strategyData });

    return true;
  }
});
function decideArenaStrategy({ user, companyId, strategyData }) {
  debug.log('decideArenaStrategy', { user, companyId, strategyData });
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      isSeal: 1,
      createdAt: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  if (companyData.isSeal) {
    throw new Meteor.Error(403, '「' + companyData.companyName + '」公司已被金融管理委員會查封關停了！');
  }
  const userId = user._id;
  if (userId !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  const lastArenaData = dbArena.findOne({}, {
    sort: {
      beginDate: -1
    },
    fields: {
      _id: 1,
      endDate: 1,
      shuffledFighterCompanyIdList: 1
    }
  });
  if (! lastArenaData) {
    throw new Meteor.Error(403, '現在並沒有舉辦最萌亂鬥大賽！');
  }
  if (lastArenaData.shuffledFighterCompanyIdList.length) {
    if ((lastArenaData.shuffledFighterCompanyIdList.length - 1) !== strategyData.attackSequence.length) {
      throw new Meteor.Error(403, '攻擊優先順序的資料格式錯誤！');
    }
    let attackSequenceIsInvalid = false;
    const attackSequenceSet = new Set();
    _.some(strategyData.attackSequence, (sequence) => {
      if (sequence < 0) {
        attackSequenceIsInvalid = true;

        return true;
      }
      attackSequenceSet.add(sequence);

      return false;
    });
    if (attackSequenceIsInvalid || attackSequenceSet.size !== strategyData.attackSequence.length) {
      throw new Meteor.Error(403, '攻擊優先順序的資料格式錯誤！');
    }
  }

  const arenaId = lastArenaData._id;
  const fighterData = dbArenaFighters.findOne({ arenaId, companyId }, {
    fields: {
      _id: 1,
      sp: 1
    }
  });
  if (! fighterData) {
    throw new Meteor.Error(403, '這家公司並沒有報名參加這一屆的最萌亂鬥大賽！');
  }
  if (strategyData.spCost > getAttributeNumber('sp', fighterData.sp)) {
    throw new Meteor.Error(403, '特攻消耗數值不可超過角色的SP值！');
  }
  else if (strategyData.spCost > 10) {
    throw new Meteor.Error(403, '特攻消耗數值不可超過10！');
  }
  else if (strategyData.spCost < 1) {
    throw new Meteor.Error(403, '特攻消耗數值不可小於1！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season']);
  dbArenaFighters.update(fighterData._id, {
    $set: strategyData
  });
}
