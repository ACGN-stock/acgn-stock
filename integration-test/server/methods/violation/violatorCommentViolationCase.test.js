import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import faker from 'faker';

import { violatorCommentViolationCase } from '/server/methods/violation/commentViolationCase';
import { violationCasesFactory, violationCaseActionLogFactory } from '/dev-utils/factories';
import { dbViolationCases, stateMap } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs, actionMap } from '/db/dbViolationCaseActionLogs';
import { getCheckData as _getCheckData, getExpectUnreadUsers as _getExpectUnreadUsers } from '/integration-test/server/methods/violation/commentViolationCaseTestHelper';

describe('method violatorCommentViolationCase', function() {
  this.timeout(10000);

  let currentUser;
  let violationCase;
  let violationCaseId;
  const reason = faker.lorem.words();

  const runViolatorCommentViolationCase = () => {
    return violatorCommentViolationCase.bind(null, currentUser, { reason, violationCaseId });
  };

  function getExpectUnreadUsers(lastActionFscMember) {
    return _getExpectUnreadUsers({ currentUser, violationCase }, lastActionFscMember);
  }

  function getCheckData() {
    return _getCheckData('violatorComment', { currentUser, violationCaseId, reason });
  }

  beforeEach(function() {
    resetDatabase();

    violationCase = violationCasesFactory.build(
      { state: faker.random.arrayElement(actionMap.violatorComment.allowedStates) },
      { violatorsNumber: faker.random.number({ min: 5, max: 100 }) }
    );
    violationCaseId = dbViolationCases.insert(violationCase);
    currentUser = { _id: faker.random.arrayElement(violationCase.violators).violatorId };
  });

  it('should fail if the violation case is not exist', function() {
    const originViolationCaseId = violationCaseId;
    violationCaseId = faker.random.uuid();

    runViolatorCommentViolationCase().must.throw(Meteor.Error, `找不到識別碼為「${violationCaseId}」的違規案件！ [404]`);

    expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
    expect(dbViolationCases.findOne(originViolationCaseId).updatedAt).to.eql(violationCase.updatedAt);
  });

  it('should fail if the violation case is not in allow state', function() {
    const notAllowStates = Object.keys(stateMap).filter((state) => {
      return ! actionMap.violatorComment.allowedStates.includes(state);
    });
    violationCase.state = faker.random.arrayElement(notAllowStates);
    dbViolationCases.update(violationCaseId, { $set: { state: violationCase.state } });

    runViolatorCommentViolationCase().must.throw(Meteor.Error, '案件狀態不符！ [403]');

    expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
    expect(dbViolationCases.findOne(violationCaseId).updatedAt).to.eql(violationCase.updatedAt);
  });

  it('should fail if the user is not violator', function() {
    currentUser.profile = { roles: ['fscMember'] };
    currentUser._id = violationCase.informer;

    runViolatorCommentViolationCase().must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');

    expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
    expect(dbViolationCases.findOne(violationCaseId).updatedAt).to.eql(violationCase.updatedAt);
  });

  it('should success comment violation case', function() {
    runViolatorCommentViolationCase().must.not.throw();

    const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
    const expectUnreadUsers = getExpectUnreadUsers();
    expect(updatedAt).to.be.above(violationCase.updatedAt);
    expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
    expect(notificationNumber).to.equal(expectUnreadUsers.length);
    expect(commentLog).to.exist();
  });

  it('should success comment violation case even other violator already commented', function() {
    const otherViolators = violationCase.violators.filter(({ violatorId }) => {
      return violatorId !== currentUser._id;
    });
    dbViolationCaseActionLogs.insert(violationCaseActionLogFactory.build({
      violationCaseId,
      action: 'violatorComment',
      executor: faker.random.arrayElement(otherViolators).violatorId
    }));

    runViolatorCommentViolationCase().must.not.throw();

    const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
    const expectUnreadUsers = getExpectUnreadUsers();
    expect(updatedAt).to.be.above(violationCase.updatedAt);
    expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
    expect(notificationNumber).to.equal(expectUnreadUsers.length);
    expect(commentLog).to.exist();
  });

  it('should fail if the user already commented as a violator before fsc do any action', function() {
    const oldActionLog = violationCaseActionLogFactory.build({
      violationCaseId,
      action: 'violatorComment',
      executor: currentUser._id
    });
    const oldActionLogId = dbViolationCaseActionLogs.insert(oldActionLog);

    runViolatorCommentViolationCase().must.throw(Meteor.Error, '在金管有進一步動作前，不得再次留言！ [403]');

    expect(dbViolationCaseActionLogs.findOne({ _id: { $ne: oldActionLogId } })).to.not.exist();
    expect(dbViolationCases.findOne(violationCaseId).updatedAt).to.eql(violationCase.updatedAt);
  });

  it('should notification last action fsc member', function() {
    const fscMemberId = faker.random.uuid();
    dbViolationCaseActionLogs.insert(violationCaseActionLogFactory.build(
      { violationCaseId, executor: fscMemberId },
      { executorIdentity: 'fsc' }
    ));

    runViolatorCommentViolationCase().must.not.throw();

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

    runViolatorCommentViolationCase().must.not.throw();

    const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
    const expectUnreadUsers = getExpectUnreadUsers();
    expect(updatedAt).to.be.above(violationCase.updatedAt);
    expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
    expect(notificationNumber).to.equal(expectUnreadUsers.length);
    expect(commentLog).to.exist();
  });
});
