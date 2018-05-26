import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { dbRuleIssueOptions } from '/db/dbRuleIssueOptions';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  voteAgenda(voteData) {
    check(this.userId, String);
    check(voteData, {
      agendaId: String,
      options: [String]
    });
    voteAgenda(Meteor.user(), voteData);

    return true;
  }
});
function voteAgenda(user, voteData) {
  debug.log('voteAgenda', { user, voteData });
  const userId = user._id;

  guardUser(user).checkCanVote();

  const agendaId = voteData.agendaId;
  const agenda = dbRuleAgendas.findOne(agendaId, {
    fields: {
      createdAt: 1,
      duration: 1,
      votes: 1
    }
  });
  if (! agenda) {
    throw new Meteor.Error(404, '議程不存在！');
  }
  if (agenda.votes.indexOf(userId) >= 0) {
    throw new Meteor.Error(403, '已經投票過的議程！');
  }
  const expireDate = new Date(agenda.createdAt.getTime() + agenda.duration * 60 * 60 * 1000);
  if (expireDate < Date.now()) {
    throw new Meteor.Error(403, '議題已經結束投票！');
  }

  dbRuleAgendas.update(agendaId, {
    $addToSet: {
      votes: userId
    }
  });
  voteData.options.forEach((optionId) => {
    dbRuleIssueOptions.update(optionId, {
      $addToSet: {
        votes: userId
      }
    });
  });
}
limitMethod('voteAgenda');
