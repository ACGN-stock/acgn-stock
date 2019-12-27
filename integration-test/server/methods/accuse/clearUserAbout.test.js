import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import expect from 'must';
import faker from 'faker';

import { clearUserAbout } from '/server/methods/accuse/clearUserAbout';
import { pttUserFactory, violationCasesFactory } from '/dev-utils/factories';
import { dbLog } from '/db/dbLog';
import { dbViolationCases } from '/db/dbViolationCases';

describe('method clearUserAbout', function() {
  this.timeout(10000);

  let userId;
  let currentUser;
  const reason = 'some reason';
  let violationCaseId;
  let about = {};

  const runClearUserAbout = () => {
    return clearUserAbout.bind(null, currentUser, { userId, reason, violationCaseId });
  };

  beforeEach(function() {
    resetDatabase();

    userId = Accounts.createUser(pttUserFactory.build());
    about = {
      description: faker.lorem.words(),
      picture: faker.image.avatar()
    };
    Meteor.users.update(userId, { $set: { about } });

    currentUser = {
      _id: faker.random.uuid(),
      profile: {
        roles: ['fscMember']
      }
    };

    violationCaseId = undefined;
  });

  it('should fail if the current user is not fsc member', function() {
    currentUser.profile.roles = [];

    runClearUserAbout().must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');

    const user = Meteor.users.findOne(userId);
    expect(user.about).to.eql(about);
  });

  it('should fail if the user is not exist', function() {
    Meteor.users.remove({});

    runClearUserAbout().must.throw(Meteor.Error, `找不到識別碼為「${userId}」的使用者！ [404]`);
  });

  it('should success clear user about', function() {
    runClearUserAbout().must.not.throw();

    const user = Meteor.users.findOne(userId);
    expect(user.about).to.eql({ description: '' });

    const log = dbLog.findOne({
      logType: '清除簡介',
      userId: { $all: [currentUser._id, userId] },
      data: { reason, violationCaseId }
    });
    expect(log).to.exist();
  });

  describe(`when insert violationCaseId`, function() {
    beforeEach(function() {
      violationCaseId = dbViolationCases.insert(violationCasesFactory.build());
    });

    it('should fail if the violation case is not exist', function() {
      dbViolationCases.remove({});

      runClearUserAbout().must.throw(Meteor.Error, `找不到識別碼為「${violationCaseId}」的違規案件！ [404]`);

      const user = Meteor.users.findOne(userId);
      expect(user.about).to.eql(about);
    });

    it('should success clear user about', function() {
      runClearUserAbout().must.not.throw();

      const user = Meteor.users.findOne(userId);
      expect(user.about).to.eql({ description: '' });

      const log = dbLog.findOne({
        logType: '清除簡介',
        userId: { $all: [currentUser._id, userId] },
        data: { reason, violationCaseId }
      });
      expect(log).to.exist();
    });
  });
});
