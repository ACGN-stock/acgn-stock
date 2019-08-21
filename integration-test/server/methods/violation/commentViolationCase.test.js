import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { _ } from 'meteor/underscore';
import expect from 'must';
import faker from 'faker';

import { commentViolationCase } from '/server/methods/violation/commentViolationCase';
import { violationCasesFactory } from '/dev-utils/factories';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs } from '/db/dbViolationCaseActionLogs';
import { dbNotifications } from '/db/dbNotifications';

describe('method commentViolationCase', function() {
  this.timeout(10000);

  let currentUser;
  let violationCase;
  let violationCaseId;
  const reason = faker.lorem.words();

  const runCommentViolationCase = () => {
    return commentViolationCase.bind(null, currentUser, { reason, violationCaseId: violationCaseId });
  };

  beforeEach(function() {
    resetDatabase();

    currentUser = {
      _id: faker.random.uuid(),
      profile: {
        roles: ['fscMember']
      }
    };
    violationCase = violationCasesFactory.build();
    violationCaseId = dbViolationCases.insert(violationCase);
  });

  it('should fail if the current user is not fsc member', function() {
    currentUser.profile.roles = [];

    runCommentViolationCase().must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');
    expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
    expect(dbViolationCases.findOne(violationCaseId).updatedAt).to.be.eql(violationCase.updatedAt);
  });

  it('should fail if the violation case is not exist', function() {
    const originViolationCaseId = violationCaseId;
    violationCaseId = faker.random.uuid();

    runCommentViolationCase().must.throw(Meteor.Error, `找不到識別碼為「${violationCaseId}」的違規案件！ [404]`);
    expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
    expect(dbViolationCases.findOne(originViolationCaseId).updatedAt).to.be.eql(violationCase.updatedAt);
  });

  it('should success comment violation case', function() {
    runCommentViolationCase().must.not.throw();

    const { violators, informer, updatedAt, unreadUsers } = dbViolationCases.findByIdOrThrow(violationCaseId, {
      fields: { violators: 1, informer: 1, updatedAt: 1, unreadUsers: 1 }
    });
    const newUnreadUsers = [
      ..._.chain(violators).where({ violatorType: 'user' }).pluck('violatorId').value(),
      informer
    ];
    const notificationNumber = dbNotifications.find().count();
    const commentLog = dbViolationCaseActionLogs.findOne({
      violationCaseId,
      action: 'comment',
      executor: currentUser._id,
      data: { reason }
    });
    expect(updatedAt).to.not.eql(violationCase.updatedAt);
    expect(unreadUsers).to.be.permutationOf(newUnreadUsers);
    expect(notificationNumber).to.be.equal(newUnreadUsers.length);
    expect(commentLog).to.exist();
  });
});
