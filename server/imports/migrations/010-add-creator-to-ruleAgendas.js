import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbRuleAgendas } from '/db/dbRuleAgendas';

defineMigration({
  version: 10,
  name: 'add creator to ruleAgendas',
  up() {
    // 將舊有的規則討論投票建立者設為提案人
    dbRuleAgendas.find().forEach(({ _id: ruleAgendaId, proposer }) => {
      dbRuleAgendas.update({ _id: ruleAgendaId }, { $set: { creator: proposer } });
    });
  }
});
