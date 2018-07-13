import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { HTTP } from 'meteor/http';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { promisify } from 'util';
import expect from 'must';
import mustSinon from 'must-sinon';
import sinon from 'sinon';

import { dbValidatingUsers } from '/db/dbValidatingUsers';

import '/server/methods/accounts/validatePTTAccount';

mustSinon(expect);

// 模擬 PTT 網頁版的推文紀錄
function generatePushRecord(userid, content) {
  return `
    <div class="push">
      <span class="push-userid">${userid}${' '.repeat(12 - userid.length)}</span>
      <span class="push-content">: ${content}</span>
    </div>
  `;
}

describe('method validatePTTAccount', function() {
  this.timeout(10000);

  function validatePTTAccount(username) {
    return promisify(Meteor.call)('validatePTTAccount', username);
  }

  const correctValidateCode = 'abcdefghij';
  const wrongValidateCode = 'zxcvbasdfg';

  const username = 'pttUser';
  const currentPassword = 'currentPassword';
  const newPassword = 'newPassword';

  beforeEach(function() {
    resetDatabase();
    sinon.stub(HTTP, 'get');
    sinon.spy(Accounts, 'setPassword');
  });

  afterEach(function() {
    HTTP.get.restore();
    Accounts.setPassword.restore();
  });

  it('should also validate other users', function() {
    dbValidatingUsers.insert({
      username,
      password: currentPassword,
      validateCode: correctValidateCode,
      createdAt: new Date()
    });

    HTTP.get.returns({ content: generatePushRecord(username, correctValidateCode) });

    return validatePTTAccount('otherPttUser').must.reject.with.an.error(Meteor.Error)
      .then(() => {
        expect(dbValidatingUsers.findOne({ username })).to.not.exist();
        expect(Meteor.users.findOne({ username })).to.exist();
      });
  });

  describe('without pending validation', function() {
    it('should throw error if the user does not exist', function() {
      return validatePTTAccount(username).must.reject.with.an.error(Meteor.Error);
    });

    it('should return true if the user already exists', function() {
      Accounts.createUser({
        username,
        password: currentPassword,
        profile: {
          name: username,
          validateType: 'PTT'
        }
      });

      return validatePTTAccount(username).must.resolve.with.true();
    });
  });

  describe('with pending validation', function() {
    beforeEach(function() {
      // 帳號正在驗證中（either 新帳號申請 or 重設密碼）
      dbValidatingUsers.insert({
        username,
        password: newPassword,
        validateCode: correctValidateCode,
        createdAt: new Date()
      });
    });

    it('should throw error if the user pushed no validation code', function() {
      HTTP.get.returns({ content: '' });

      return validatePTTAccount(username).must.reject.with.an.error(Meteor.Error);
    });

    it('should throw error if the user pushed wrong validation code', function() {
      HTTP.get.returns({ content: generatePushRecord(username, wrongValidateCode) });

      return validatePTTAccount(username).must.reject.with.an.error(Meteor.Error);
    });

    it('should create a new user if the validation passed and the user does not exist', function() {
      HTTP.get.returns({ content: generatePushRecord(username, correctValidateCode) });

      return validatePTTAccount(username).must.resolve.with.true()
        .then(() => {
          expect(Meteor.users.find({ username })).to.exist();
        });
    });

    it('should reset user password if the validation passed and the user already exists', function() {
      Accounts.createUser({
        username,
        password: currentPassword,
        profile: {
          name: username,
          validateType: 'PTT'
        }
      });

      HTTP.get.returns({ content: generatePushRecord(username, correctValidateCode) });

      return validatePTTAccount(username).must.resolve.with.true()
        .then(() => {
          const { _id: userId } = Meteor.users.findOne({ username });
          Accounts.setPassword.must.have.been.calledWith(userId, newPassword);
        });
    });

    it('should not affect the user that only partially matches the username', function() {
      // 真帳號已存在於系統（完成驗證），但正在等待驗證（重設密碼）
      Accounts.createUser({
        username,
        password: currentPassword,
        profile: {
          name: username,
          validateType: 'PTT'
        }
      });

      // 存在假帳號，其使用者名稱包含真帳號
      const fakeUsername = `${username}2`;

      // 假帳號同時存在於系統（完成驗證），且並不處於待驗證狀態
      Accounts.createUser({
        username: fakeUsername,
        password: currentPassword,
        profile: {
          name: fakeUsername,
          validateType: 'PTT'
        }
      });

      // 取得真帳號的驗證碼後用假帳號推文
      HTTP.get.returns({ content: generatePushRecord(fakeUsername, correctValidateCode) });

      return validatePTTAccount(fakeUsername).then(() => {
        // 真帳號的密碼不應被重設
        const { _id: userId } = Meteor.users.findOne({ username });
        Accounts.setPassword.must.have.not.been.calledWith(userId, newPassword);
      });
    });
  });
});
