import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { dbRuleIssues } from '/db/dbRuleIssues';
import { dbRuleIssueOptions } from '/db/dbRuleIssueOptions';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  takeDownRuleAgenda(agendaId) {
    check(this.userId, String);
    check(agendaId, String);
    takeDownRuleAgenda(Meteor.user(), agendaId);

    return true;
  }
});
function takeDownRuleAgenda(user, agendaId) {
  debug.log('takeDownRuleAgenda', {user, agendaId});
  const agenda = dbRuleAgendas.findOne(agendaId, {
    fields: {
      issues: 1
    }
  });
  if (! agenda) {
    throw new Meteor.Error(404, '議程不存在！');
  }
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '非金管委員不得撤銷議程！');
  }

  let options = [];
  agenda.issues.forEach((issueId) => {
    const issue = dbRuleIssues.findOne(issueId);
    if (issue) {
      options = options.concat(issue.options);
    }
  });

  dbRuleIssueOptions.remove({
    _id: {
      $in: options
    }
  });
  dbRuleIssues.remove({
    _id: {
      $in: agenda.issues
    }
  });
  dbRuleAgendas.remove(agendaId);
}
//二十秒鐘最多一次
limitMethod('takeDownRuleAgenda', 1, 20000);
