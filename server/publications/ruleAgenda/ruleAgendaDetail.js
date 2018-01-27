import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { dbRuleIssues } from '/db/dbRuleIssues';
import { dbRuleIssueOptions } from '/db/dbRuleIssueOptions';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.publish('ruleAgendaDetail', function(agendaId) {
  debug.log('publish ruleAgendaDetail');
  check(agendaId, String);

  const agendaCursor = dbRuleAgendas.find(agendaId);
  const agenda = agendaCursor.fetch()[0];
  const issueCursor = dbRuleIssues.find({
    _id: {
      $in: agenda.issues
    }
  });
  let optionIds = [];
  issueCursor.forEach((issue) => {
    optionIds = optionIds.concat(issue.options);
  });
  const optionCursor = dbRuleIssueOptions.find({
    _id: {
      $in: optionIds
    }
  });

  return [agendaCursor, issueCursor, optionCursor];
});
// 一分鐘最多重複訂閱5次
limitSubscription('ruleAgendaDetail', 5);
