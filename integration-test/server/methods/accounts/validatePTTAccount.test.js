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

    HTTP.get.returns({
      content: `
        <div class="push">
          <span class="push-userid">${username}</span>
          <span class="push-content">: ${correctValidateCode}</span>
        </div>
      `
    });

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
      HTTP.get.returns({
        content: `
          <div class="push">
            <span class="push-userid">${username}</span>
            <span class="push-content">: ${wrongValidateCode}</span>
          </div>
        `
      });

      return validatePTTAccount(username).must.reject.with.an.error(Meteor.Error);
    });

    it('should create a new user if the validation passed and the user does not exist', function() {
      HTTP.get.returns({
        content: `
          <div class="push">
            <span class="push-userid">${username}</span>
            <span class="push-content">: ${correctValidateCode}</span>
          </div>
        `
      });

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

      HTTP.get.returns({
        content: `
          <div class="push">
            <span class="push-userid">${username}</span>
            <span class="push-content">: ${correctValidateCode}</span>
          </div>
        `
      });

      return validatePTTAccount(username).must.resolve.with.true()
        .then(() => {
          const { _id: userId } = Meteor.users.findOne({ username });
          Accounts.setPassword.must.have.been.calledWith(userId, newPassword);
        });
    });
  });
});
