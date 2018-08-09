import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { pttUserFactory } from '/dev-utils/factories';
import { dbRound } from '/db/dbRound';
import { dbAnnouncements } from '/db/dbAnnouncements';
import { wrapWithFakeTimers } from '/integration-test/server/imports/wrapWithFakeTimers';
import { signRejectionPetition } from '/server/methods/announcement/signRejectionPetition';

mustSinon(expect);

describe('method signRejectionPetition', wrapWithFakeTimers(function() {
  this.timeout(10000);

  let userId;
  let announcementId;
  const category = 'plannedRuleChanges';

  const petitionData = {
    dueAt: new Date(Date.now() + 86400000),
    signers: ['signedUser'],
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
      rejectionPetition: petitionData
    });
  });

  it('should fail if the announcement has no petition data', function() {
    dbAnnouncements.update(announcementId, { $unset: { rejectionPetition: 0 } });
    signRejectionPetition.bind(null, Meteor.users.findOne(userId), { announcementId }).must.throw(Meteor.Error, '此公告並無進行否決連署！ [403]');
  });

  it('should fail if the announcement has been voided', function() {
    dbAnnouncements.update(announcementId, { $set: { voided: true } });
    signRejectionPetition.bind(null, Meteor.users.findOne(userId), { announcementId }).must.throw(Meteor.Error, '此公告已作廢！ [403]');
  });

  it('should fail if the user has already signed', function() {
    dbAnnouncements.update(announcementId, { $set: { 'rejectionPetition.signers': [userId] } });
    signRejectionPetition.bind(null, Meteor.users.findOne(userId), { announcementId }).must.throw(Meteor.Error, '您已經連署過了！ [403]');
  });

  it('should fail if the petition threshold is already met', function() {
    dbAnnouncements.update(announcementId, {
      $set: {
        'rejectionPetition.thresholdPercent': 100,
        'rejectionPetition.activeUserCount': 1
      }
    });
    signRejectionPetition.bind(null, Meteor.users.findOne(userId), { announcementId }).must.throw(Meteor.Error, '連署人數已達門檻！ [403]');
  });

  it('should fail if the petition is overdue', function() {
    dbAnnouncements.update(announcementId, { $set: { 'rejectionPetition.dueAt': new Date(Date.now() - 1) } });
    signRejectionPetition.bind(null, Meteor.users.findOne(userId), { announcementId }).must.throw(Meteor.Error, '連署時間已過！ [403]');
  });

  it('should not trigger poll if the threshold is not met', function() {
    signRejectionPetition(Meteor.users.findOne(userId), { announcementId });
    expect(dbAnnouncements.findOne(announcementId).rejectionPoll).to.not.exist();
  });

  it('should start poll if the threshold is met', function() {
    dbAnnouncements.update(announcementId, {
      $set: {
        'rejectionPetition.signers': [],
        'rejectionPetition.thresholdPercent': 0,
        'rejectionPetition.activeUserCount': 0
      }
    });
    signRejectionPetition(Meteor.users.findOne(userId), { announcementId });
    const { rejectionPoll: poll } = dbAnnouncements.findOne(announcementId);
    expect(poll).to.exist();
  });
}));
