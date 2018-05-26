import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  updateAgendaProposer(agendaId, proposerId) {
    check(this.userId, String);
    check(agendaId, String);
    check(proposerId, String);
    updateAgendaProposer(Meteor.user(), agendaId, proposerId);

    return true;
  }
});
function updateAgendaProposer(user, agendaId, proposerId) {
  debug.log('updateAgendaProposer', { user, agendaId, proposerId });
  guardUser(user).checkHasRole('planner');
  Meteor.users.findByIdOrThrow({ _id: proposerId }, { fields: { _id: 1 } });
  dbRuleAgendas.update({ _id: agendaId }, { $set: { proposer: proposerId } });
}
limitMethod('updateAgendaProposer');
