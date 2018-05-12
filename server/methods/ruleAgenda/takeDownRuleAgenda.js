import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { dbRuleIssues } from '/db/dbRuleIssues';
import { dbRuleIssueOptions } from '/db/dbRuleIssueOptions';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { guardUser } from '/common/imports/guards';

Meteor.methods({
  takeDownRuleAgenda(agendaId) {
    check(this.userId, String);
    check(agendaId, String);
    takeDownRuleAgenda(Meteor.user(), agendaId);

    return true;
  }
});
function takeDownRuleAgenda(user, agendaId) {
  debug.log('takeDownRuleAgenda', { user, agendaId });

  guardUser(user).checkHasRole('planner');

  const agenda = dbRuleAgendas.findByIdOrThrow(agendaId, { fields: { issues: 1 } });

  let options = [];
  agenda.issues.forEach((issueId) => {
    const issue = dbRuleIssues.findOne(issueId);
    if (issue) {
      options = options.concat(issue.options);
    }
  });

  dbRuleIssueOptions.remove({ _id: { $in: options } });
  dbRuleIssues.remove({ _id: { $in: agenda.issues } });
  dbRuleAgendas.remove(agendaId);
}
// 二十秒鐘最多一次
limitMethod('takeDownRuleAgenda', 1, 20000);
