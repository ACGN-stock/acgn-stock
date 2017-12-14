import { _ } from 'meteor/underscore';

import { dbArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { getCurrentArena } from './getCurrentArena';

// 初始化所有參賽者的攻擊次序
export function initializeAttackSequences() {
  const { _id: arenaId } = getCurrentArena();

  // 隨機排列參賽者清單
  const fighterCompanyIdList = dbArenaFighters
    .find({ arenaId }, { fields: { companyId: 1 } })
    .map((arenaFighter) => {
      return arenaFighter.companyId;
    });
  const shuffledFighterCompanyIdList = _.shuffle(fighterCompanyIdList);
  dbArena.update(arenaId, { $set: { shuffledFighterCompanyIdList } });

  // 生成各個參賽者的隨機攻擊順序
  const attackSequence = _.range(shuffledFighterCompanyIdList.length);
  dbArenaFighters
    .find({}, { fields: { _id: 1, companyId: 1 } })
    .forEach(({ _id: fighterId, companyId }) => {
      const thisFighterIndex = _.indexOf(shuffledFighterCompanyIdList, companyId);
      const thisAttackSequence = _.without(attackSequence, thisFighterIndex);
      const shuffledAttackSequence = _.shuffle(thisAttackSequence);
      dbArenaFighters.update(fighterId, { $set: { attackSequence: shuffledAttackSequence } });
    });
}
