import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { dbRuleIssues } from '/db/dbRuleIssues';
import { dbRuleIssueOptions } from '/db/dbRuleIssueOptions';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  createAgenda(agendaData) {
    check(this.userId, String);
    check(agendaData, {
      title: String,
      proposer: String,
      description: String,
      discussionUrl: new Match.Optional(String),
      issues: Match.Any
    });

    _.each(agendaData.issues, (issue) => {
      check(issue, {
        title: String,
        multiple: Boolean,
        options: [String]
      });
    });
    createAgenda(Meteor.user(), agendaData);

    return true;
  }
});
function createAgenda(user, agendaData) {
  debug.log('createAgenda', {user, agendaData});
  const userId = user._id;
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(403, '非金管委員不得建立議程！');
  }

  const issues = agendaData.issues;
  if (issues.length === 0) {
    throw new Meteor.Error(403, '沒有須投票的議題！');
  }
  if (issues.length > Meteor.settings.public.maximumRuleIssue) {
    throw new Meteor.Error(403, '須投票的議題過多！');
  }

  issues.forEach((issue) => {
    if (issue.options.length < 2) {
      throw new Meteor.Error(403, '每個議題應有至少兩個選項！');
    }
    if (issue.options.length > Meteor.settings.public.maximumRuleIssueOption) {
      throw new Meteor.Error(403, '議題選項過多！');
    }
  });

  const proposer = Meteor.users.findOne({
    _id: agendaData.proposer
  });
  if (! proposer) {
    throw new Meteor.Error(404, '提案人帳號不存在！');
  }

  const issueIds = [];
  issues.forEach((issue, issueIndex) => {
    const optionIds = [];
    issue.options.forEach((option, optionIndex) => {
      const optionId = dbRuleIssueOptions.insert({
        title: option,
        order: optionIndex
      });
      optionIds.push(optionId);
    });

    const issueId = dbRuleIssues.insert({
      title: issue.title,
      multiple: issue.multiple,
      order: issueIndex,
      options: optionIds
    });
    issueIds.push(issueId);
  });

  const createdAt = new Date();
  dbRuleAgendas.insert({
    title: agendaData.title,
    description: agendaData.description,
    discussionUrl: agendaData.discussionUrl,
    proposer: agendaData.proposer,
    creator: userId,
    createdAt: createdAt,
    issues: issueIds
  });
}
//二十秒鐘最多一次
limitMethod('createAgenda', 1, 20000);
