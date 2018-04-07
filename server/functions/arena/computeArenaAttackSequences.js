import { _ } from 'meteor/underscore';

import { dbArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';

// 計算出所有報名者的攻擊次序
export function computeArenaAttackSequences() {
  const lastArenaData = dbArena.findOne({}, { sort: { beginDate: -1 }, fields: { _id: 1 } });

  if (! lastArenaData) {
    return;
  }

  const { _id: arenaId } = lastArenaData;

  const fighterCompanyIdList = _.pluck(dbArenaFighters.find({ arenaId }, { fields: { companyId: 1 } }).fetch(), 'companyId');
  const shuffledFighterCompanyIdList = _.shuffle(fighterCompanyIdList);
  const attackSequence = _.range(shuffledFighterCompanyIdList.length);

  dbArena.update(arenaId, { $set: { shuffledFighterCompanyIdList } });
  dbArenaFighters
    .find({}, { fields: { _id: 1, companyId: 1 } })
    .forEach((fighter) => {
      const thisFighterIndex = _.indexOf(shuffledFighterCompanyIdList, fighter.companyId);
      const thisAttackSequence = _.without(attackSequence, thisFighterIndex);
      const shuffledAttackSequence = _.shuffle(thisAttackSequence);
      dbArenaFighters.update(fighter._id, { $set: { attackSequence: shuffledAttackSequence } });
    });
}
