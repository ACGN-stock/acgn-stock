import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { pttUserFactory } from '/dev-utils/factories';
import { dbRound } from '/db/dbRound';
import { dbAnnouncements } from '/db/dbAnnouncements';
import { wrapWithFakeTimers } from '/integration-test/server/imports/wrapWithFakeTimers';
import { voteRejectionPoll } from '/server/methods/announcement/voteRejectionPoll';

mustSinon(expect);

describe('method voteRejectionPoll', wrapWithFakeTimers(function() {
  this.timeout(10000);

  let userId;
  let announcementId;
  const category = 'plannedRuleChanges';

  const pollData = {
    dueAt: new Date(Date.now() + 86400000),
    yesVotes: [],
    noVotes: [],
    thresholdPercent: 100,
    activeUserCount: 100
  };

  beforeEach(function() {
    resetDatabase();
    dbRound.insert({ beginDate: new Date(), endDate: new Date(Date.now() + 86400000 * 2) });
    userId = Accounts.createUser(pttUserFactory.build());
    Meteor.users.update(userId, {
      $set: {
        createdAt: new Date(0),
        'profile.money': 0,
        'profile.ban': []
      }
    });
    announcementId = dbAnnouncements.insert({
      creator: 'creatorUserId',
      category,
      subject: 'Test',
      content: 'This is a test.',
      createdAt: new Date(),
      rejectionPoll: pollData
    });
  });

  it('should fail if the announcement has no poll data', function() {
    dbAnnouncements.update(announcementId, { $unset: { rejectionPoll: 0 } });
    voteRejectionPoll.bind(null, Meteor.users.findOne(userId), { announcementId, choice: 'yes' }).must.throw(Meteor.Error, '此公告並無進行否決投票！ [403]');
  });

  it('should fail if the announcement has been voided', function() {
    dbAnnouncements.update(announcementId, { $set: { voided: true } });
    voteRejectionPoll.bind(null, Meteor.users.findOne(userId), { announcementId, choice: 'yes' }).must.throw(Meteor.Error, '此公告已作廢！ [403]');
  });

  it('should fail if the user has already voted', function() {
    dbAnnouncements.update(announcementId, { $set: { 'rejectionPoll.yesVotes': [userId] } });
    voteRejectionPoll.bind(null, Meteor.users.findOne(userId), { announcementId, choice: 'yes' }).must.throw(Meteor.Error, '您已經投票過了！ [403]');
  });

  it('should fail if the poll is overdue', function() {
    dbAnnouncements.update(announcementId, { $set: { 'rejectionPoll.dueAt': new Date(Date.now() - 1) } });
    voteRejectionPoll.bind(null, Meteor.users.findOne(userId), { announcementId, choice: 'yes' }).must.throw(Meteor.Error, '投票時間已過！ [403]');
  });

  it('should success not trigger poll if the threshold is not met', function() {
    voteRejectionPoll(Meteor.users.findOne(userId), { announcementId, choice: 'yes' });
    const { rejectionPoll: poll } = dbAnnouncements.findOne(announcementId);
    poll.yesVotes.must.include(userId);
  });
}));
