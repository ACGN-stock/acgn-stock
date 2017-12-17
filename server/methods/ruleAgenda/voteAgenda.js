import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { dbRuleIssueOptions } from '/db/dbRuleIssueOptions';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

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
  debug.log('voteAgenda', {user, voteData});
  const userId = user._id;
  if (user.profile.ban.length > 0) {
    throw new Meteor.Error(403, '你已被禁止投票！');
  }
  if (user.profile.money < 0) {
    throw new Meteor.Error(403, '現金為負數者不可投票！');
  }
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '有逾期稅單未繳納者不可投票！');
  }
  if (Date.now() - user.createdAt.getTime() < Meteor.settings.public.voteUserNeedCreatedIn) {
    throw new Meteor.Error(403, '註冊未滿七日不可投票！');
  }

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
