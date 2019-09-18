import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import faker from 'faker';

import { fscCommentViolationCase } from '/server/methods/violation/commentViolationCase';
import { violationCasesFactory, violationCaseActionLogFactory } from '/dev-utils/factories';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs } from '/db/dbViolationCaseActionLogs';
import { getCheckData as _getCheckData, getExpectUnreadUsers as _getExpectUnreadUsers } from '/integration-test/server/methods/violation/commentViolationCaseTestHelper';

describe('method fscCommentViolationCase', function() {
  this.timeout(10000);

  let currentUser;
  let violationCase;
  let violationCaseId;
  const reason = faker.lorem.words();

  const runFscCommentViolationCase = () => {
    return fscCommentViolationCase.bind(null, currentUser, { reason, violationCaseId });
  };

  function getExpectUnreadUsers(lastActionFscMember) {
    return _getExpectUnreadUsers({ currentUser, violationCase }, lastActionFscMember);
  }

  function getCheckData() {
    return _getCheckData('fscComment', { currentUser, violationCaseId, reason });
  }

  beforeEach(function() {
    resetDatabase();

    currentUser = {
      _id: faker.random.uuid(),
      profile: { roles: ['fscMember'] }
    };
    violationCase = violationCasesFactory.build({}, { violatorsNumber: faker.random.number({ min: 5, max: 100 }) });
    violationCaseId = dbViolationCases.insert(violationCase);
  });

  it('should fail if the violation case is not exist', function() {
    const originViolationCaseId = violationCaseId;
    violationCaseId = faker.random.uuid();

    runFscCommentViolationCase().must.throw(Meteor.Error, `找不到識別碼為「${violationCaseId}」的違規案件！ [404]`);

    expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
    expect(dbViolationCases.findOne(originViolationCaseId).updatedAt).to.eql(violationCase.updatedAt);
  });

  it('should fail if the user is not fsc member', function() {
    currentUser.profile = { roles: [] };
    currentUser._id = faker.random.arrayElement(violationCase.violators).violatorId;

    runFscCommentViolationCase().must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');

    expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
    expect(dbViolationCases.findOne(violationCaseId).updatedAt).to.eql(violationCase.updatedAt);
  });

  it('should success comment violation case', function() {
    runFscCommentViolationCase().must.not.throw();

    const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
    const expectUnreadUsers = getExpectUnreadUsers();
    expect(updatedAt).to.be.above(violationCase.updatedAt);
    expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
    expect(notificationNumber).to.equal(expectUnreadUsers.length);
    expect(commentLog).to.exist();
  });

  it('should notification last action fsc member', function() {
    const fscMemberId = faker.random.uuid();
    dbViolationCaseActionLogs.insert(violationCaseActionLogFactory.build(
      { violationCaseId, executor: fscMemberId },
      { executorIdentity: 'fsc' }
    ));

    runFscCommentViolationCase().must.not.throw();

    const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
    const expectUnreadUsers = getExpectUnreadUsers(fscMemberId);
    expect(updatedAt).to.be.above(violationCase.updatedAt);
    expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
    expect(notificationNumber).to.equal(expectUnreadUsers.length);
    expect(commentLog).to.exist();
  });

  it('should not notification last action fsc member if that member is himself', function() {
    dbViolationCaseActionLogs.insert(violationCaseActionLogFactory.build(
      { violationCaseId, executor: currentUser._id },
      { executorIdentity: 'fsc' }
    ));

    runFscCommentViolationCase().must.not.throw();

    const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
    const expectUnreadUsers = getExpectUnreadUsers();
    expect(updatedAt).to.be.above(violationCase.updatedAt);
    expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
    expect(notificationNumber).to.equal(expectUnreadUsers.length);
    expect(commentLog).to.exist();
  });
});
