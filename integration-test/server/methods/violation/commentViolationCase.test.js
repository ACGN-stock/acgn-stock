import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { _ } from 'meteor/underscore';
import expect from 'must';
import faker from 'faker';

import { commentViolationCase } from '/server/methods/violation/commentViolationCase';
import { violationCasesFactory, violationCaseActionLogFactory } from '/dev-utils/factories';
import { dbViolationCases } from '/db/dbViolationCases';
import { dbViolationCaseActionLogs } from '/db/dbViolationCaseActionLogs';
import { dbNotifications } from '/db/dbNotifications';

describe('method commentViolationCase', function() {
  this.timeout(10000);

  let currentUser;
  let violationCase;
  let violationCaseId;
  let commentIdentity;
  const reason = faker.lorem.words();

  const runCommentViolationCase = () => {
    return commentViolationCase.bind(null, currentUser, { reason, violationCaseId, commentIdentity });
  };

  /**
   * @param {String} lastActionFscMember fsc member id
   * @return {Array} expectUnreadUsers
   */
  function getExpectUnreadUsers(lastActionFscMember) {
    const expectUnreadUsers = [
      ..._.chain(violationCase.violators).where({ violatorType: 'user' }).pluck('violatorId').value(),
      violationCase.informer
    ];
    if (lastActionFscMember) {
      expectUnreadUsers.push(lastActionFscMember);
    }

    return expectUnreadUsers.filter((userId) => {
      return userId !== currentUser._id;
    });
  }

  /**
   * @typedef {Object} CheckData { updatedAt, unreadUsers, notificationNumber, commentLog }
   * @property {Date} updatedAt
   * @property {String[]} unreadUsers
   * @property {Number} notificationNumber
   * @property {Object} commentLog
   */
  /**
   * @return {CheckData} check data
   */
  function getCheckData() {
    const { updatedAt, unreadUsers } = dbViolationCases.findByIdOrThrow(violationCaseId, {
      fields: { updatedAt: 1, unreadUsers: 1 }
    });
    const notificationNumber = dbNotifications.find().count();
    const commentLog = dbViolationCaseActionLogs.findOne({
      violationCaseId,
      action: 'comment',
      executor: currentUser._id,
      data: { reason, commentIdentity }
    });

    return { updatedAt, unreadUsers, notificationNumber, commentLog };
  }

  beforeEach(function() {
    resetDatabase();

    currentUser = {
      _id: faker.random.uuid()
    };
    violationCase = violationCasesFactory.build({}, { violatorsNumber: faker.random.number({ min: 5, max: 100 }) });
    violationCaseId = dbViolationCases.insert(violationCase);
    commentIdentity = 'fsc';
  });

  it('should fail if the violation case is not exist', function() {
    const originViolationCaseId = violationCaseId;
    violationCaseId = faker.random.uuid();
    currentUser.profile = { roles: ['fscMember'] };

    runCommentViolationCase().must.throw(Meteor.Error, `找不到識別碼為「${violationCaseId}」的違規案件！ [404]`);
    expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
    expect(dbViolationCases.findOne(originViolationCaseId).updatedAt).to.eql(violationCase.updatedAt);
  });


  describe('when commentIdentity is informer', function() {
    beforeEach(function() {
      commentIdentity = 'informer';
      currentUser._id = violationCase.informer;
    });

    it('should fail if the user is not informer', function() {
      currentUser.profile = { roles: ['fscMember'] };
      currentUser._id = faker.random.arrayElement(violationCase.violators).violatorId;
      runCommentViolationCase().must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');

      expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
      expect(dbViolationCases.findOne(violationCaseId).updatedAt).to.eql(violationCase.updatedAt);
    });

    it('should success comment violation case', function() {
      runCommentViolationCase().must.not.throw();

      const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
      const expectUnreadUsers = getExpectUnreadUsers();
      expect(updatedAt).to.be.above(violationCase.updatedAt);
      expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
      expect(notificationNumber).to.equal(expectUnreadUsers.length);
      expect(commentLog).to.exist();
    });

    it('should fail if the user already commented as an informer before fsc do any action', function() {
      const insertLog = violationCaseActionLogFactory.build({
        violationCaseId,
        action: 'comment',
        executor: currentUser._id,
        data: {
          reason: faker.lorem.words(),
          commentIdentity: 'informer'
        }
      });
      const oldActionLogId = dbViolationCaseActionLogs.insert(insertLog);

      runCommentViolationCase().must.throw(Meteor.Error, '在金管有進一步動作前，不得再次留言！ [403]');

      expect(dbViolationCaseActionLogs.findOne({ _id: { $ne: oldActionLogId } })).to.not.exist();
      expect(dbViolationCases.findOne(violationCaseId).updatedAt).to.eql(violationCase.updatedAt);
    });


    describe('when any fsc member has actioned to violation case', function() {
      let fscMemberId;

      beforeEach(function() {
        fscMemberId = faker.random.uuid();
        const insertLog = violationCaseActionLogFactory.build(
          { violationCaseId, executor: fscMemberId },
          { executorIdentity: 'fsc' }
        );
        dbViolationCaseActionLogs.insert(insertLog);
      });

      it('should notification last action fsc member if success comment', function() {
        runCommentViolationCase().must.not.throw();

        const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
        const expectUnreadUsers = getExpectUnreadUsers(fscMemberId);
        expect(updatedAt).to.be.above(violationCase.updatedAt);
        expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
        expect(notificationNumber).to.equal(expectUnreadUsers.length);
        expect(commentLog).to.exist();
      });
    });
  });


  describe('when commentIdentity is violator', function() {
    beforeEach(function() {
      commentIdentity = 'violator';
      currentUser._id = faker.random.arrayElement(violationCase.violators).violatorId;
    });

    it('should fail if the user is not violator', function() {
      currentUser._id = violationCase.informer;
      currentUser.profile = { roles: ['fscMember'] };
      runCommentViolationCase().must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');

      expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
      expect(dbViolationCases.findOne(violationCaseId).updatedAt).to.eql(violationCase.updatedAt);
    });

    it('should success comment violation case', function() {
      runCommentViolationCase().must.not.throw();

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
        action: 'comment',
        executor: faker.random.arrayElement(otherViolators).violatorId,
        data: {
          reason: faker.lorem.words(),
          commentIdentity: 'violator'
        }
      }));

      runCommentViolationCase().must.not.throw();

      const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
      const expectUnreadUsers = getExpectUnreadUsers();
      expect(updatedAt).to.be.above(violationCase.updatedAt);
      expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
      expect(notificationNumber).to.equal(expectUnreadUsers.length);
      expect(commentLog).to.exist();
    });

    it('should fail if the user already commented as a violator before fsc do any action', function() {
      const insertLog = violationCaseActionLogFactory.build({
        violationCaseId,
        action: 'comment',
        executor: currentUser._id,
        data: {
          reason: faker.lorem.words(),
          commentIdentity: 'violator'
        }
      });
      const oldActionLogId = dbViolationCaseActionLogs.insert(insertLog);

      runCommentViolationCase().must.throw(Meteor.Error, '在金管有進一步動作前，不得再次留言！ [403]');

      expect(dbViolationCaseActionLogs.findOne({ _id: { $ne: oldActionLogId } })).to.not.exist();
      expect(dbViolationCases.findOne(violationCaseId).updatedAt).to.eql(violationCase.updatedAt);
    });


    describe('when any fsc member has actioned to violation case', function() {
      let fscMemberId;

      beforeEach(function() {
        fscMemberId = faker.random.uuid();
        const insertLog = violationCaseActionLogFactory.build(
          { violationCaseId, executor: fscMemberId },
          { executorIdentity: 'fsc' }
        );
        dbViolationCaseActionLogs.insert(insertLog);
      });

      it('should notification last action fsc member if success comment', function() {
        runCommentViolationCase().must.not.throw();

        const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
        const expectUnreadUsers = getExpectUnreadUsers(fscMemberId);
        expect(updatedAt).to.be.above(violationCase.updatedAt);
        expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
        expect(notificationNumber).to.equal(expectUnreadUsers.length);
        expect(commentLog).to.exist();
      });
    });
  });


  describe('when commentIdentity is fsc', function() {
    beforeEach(function() {
      commentIdentity = 'fsc';
      currentUser.profile = { roles: ['fscMember'] };
    });

    it('should fail if the user is not fsc member', function() {
      currentUser.profile = { roles: [] };
      currentUser._id = faker.random.arrayElement(violationCase.violators).violatorId;
      runCommentViolationCase().must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');

      expect(dbViolationCaseActionLogs.findOne()).to.not.exist();
      expect(dbViolationCases.findOne(violationCaseId).updatedAt).to.eql(violationCase.updatedAt);
    });

    it('should success comment violation case', function() {
      runCommentViolationCase().must.not.throw();

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

      runCommentViolationCase().must.not.throw();

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

      runCommentViolationCase().must.not.throw();

      const { updatedAt, unreadUsers, notificationNumber, commentLog } = getCheckData();
      const expectUnreadUsers = getExpectUnreadUsers();
      expect(updatedAt).to.be.above(violationCase.updatedAt);
      expect(unreadUsers).to.be.permutationOf(expectUnreadUsers);
      expect(notificationNumber).to.equal(expectUnreadUsers.length);
      expect(commentLog).to.exist();
    });
  });
});
