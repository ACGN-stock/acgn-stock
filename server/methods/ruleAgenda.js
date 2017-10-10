'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { resourceManager } from '../resourceManager';
import { check, Match } from 'meteor/check';
import { dbRuleAgendas } from '../../db/dbRuleAgendas';
import { dbRuleIssues } from '../../db/dbRuleIssues';
import { dbRuleIssueOptions } from '../../db/dbRuleIssueOptions';
import { dbLog } from '../../db/dbLog';
import { config } from '../../config';
import { limitSubscription, limitMethod } from './rateLimit';
import { debug } from '../debug';

Meteor.methods({
  createAgenda(agendaData) {
    check(this.userId, String);
    check(agendaData, {
      title: String,
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
  resourceManager.throwErrorIsResourceIsLock(['user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('createAgenda', ['user' + userId], (release) => {

    const issues = agendaData.issues;
    if (issues.length === 0) {
      throw new Meteor.Error(403, '沒有須投票的議題！');
    }
    if (issues.length > config.maximumRuleIssue) {
      throw new Meteor.Error(403, '須投票的議題過多！');
    }

    issues.forEach((issue) => {
      if (issue.options.length < 2) {
        throw new Meteor.Error(403, '每個議題應有至少兩個選項！');
      }
      if (issue.options.length > config.maximumRuleIssueOption) {
        throw new Meteor.Error(403, '議題選項過多！');
      }
    });
      
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
      proposer: userId,
      createdAt: createdAt,
      issues: issueIds
    });
    release();
  });
}
//二十秒鐘最多一次
limitMethod('createAgenda', 1, 20000);

Meteor.publish('allRuleAgenda', function() {
  debug.log('publish allRuleAgenda');

  return dbRuleAgendas.find({}, {
    disableOplog: true
  });
});
//一分鐘最多重複訂閱5次
limitSubscription('allRuleAgenda', 5);

Meteor.publish("ruleAgendaDetail", function (agendaId) {
  debug.log('publish allRuleAgenda');
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

  return [ agendaCursor, issueCursor, optionCursor ];
});
//一分鐘最多重複訂閱5次
limitSubscription('allRuleAgenda', 5);

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
  resourceManager.throwErrorIsResourceIsLock(['user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('voteAgenda', ['user' + userId], (release) => {

    const agendaId = voteData.agendaId;
    const agenda = dbRuleAgendas.findOne(agendaId, {
      fields: {
        createdAt: 1,
        duration: 1,
        votes: 1
      }
    });
    console.log('agenda', agenda);
    console.log('voteData', voteData);
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
    release();
  });
}
//二十秒鐘最多一次
limitMethod('voteAgenda', 1, 20000);
