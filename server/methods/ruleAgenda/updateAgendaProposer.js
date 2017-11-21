import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { limitMethod } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

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
  debug.log('updateAgendaProposer', {user, agendaId, proposerId});
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '非金管委員不得修改提案人！');
  }

  const proposer = Meteor.users.findOne({
    _id: proposerId
  });
  if (! proposer) {
    throw new Meteor.Error(404, '提案人帳號不存在！');
  }

  dbRuleAgendas.update({
    _id: agendaId
  }, {
    $set: {
      proposer: proposerId
    }
  });
}
limitMethod('updateAgendaProposer');
