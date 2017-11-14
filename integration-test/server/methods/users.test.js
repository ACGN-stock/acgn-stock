import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { HTTP } from 'meteor/http';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { promisify } from 'util';
import expect from 'must';
import sinon from 'sinon';

import { dbValidatingUsers } from '/db/dbValidatingUsers';

import '/server/methods/users';

describe('method loginOrRegister', function() {
  const userData = {
    username: 'someone',
    password: 'mypass',
    profile: {
      name: 'someone',
      validateType: 'PTT'
    }
  };

  const validateCodePattern = /^[0-9a-zA-Z]{10}$/;

  beforeEach(function() {
    resetDatabase();
  });

  describe('when the user exists', function() {
    beforeEach(function() {
      Accounts.createUser(userData);
    });

    it('should return true', function() {
      return promisify(Meteor.call)('loginOrRegister', {
        username: userData.username,
        password: userData.password,
        type: userData.profile.validateType,
        reset: false
      }).must.resolve.to.be.true();
    });

    it('should return a validation code and save the user data to validatingUsers when the user wants to reset the password', function() {
      const newPassword = 'newPassword';

      return promisify(Meteor.call)('loginOrRegister', {
        username: userData.username,
        password: newPassword,
        type: userData.profile.validateType,
        reset: true
      })
        .then((result) => {
          expect(result).to.match(validateCodePattern);

          const validatingUser = dbValidatingUsers.findOne({
            username: userData.username,
            password: newPassword
          });
          expect(validatingUser).to.exist();
          expect(validatingUser.validateCode).to.be.equal(result);
        });
    });
  });

  describe('when the user does not exist', function() {
    it('should return a validation code and save the user data to validatingUsers', function() {
      return promisify(Meteor.call)('loginOrRegister', {
        username: userData.username,
        password: userData.password,
        type: userData.profile.validateType,
        reset: false
      })
        .then((result) => {
          expect(result).to.match(validateCodePattern);

          const validatingUser = dbValidatingUsers.findOne({
            username: userData.username,
            password: userData.password
          });
          expect(validatingUser).to.exist();
          expect(validatingUser.validateCode).to.equal(result);
        });
    });

    it('should return the same validation code across different calls', function() {
      const methodParams = [
        {
          username: userData.username,
          password: userData.password,
          type: userData.profile.validateType,
          reset: false
        }
      ];

      return Promise.all([
        promisify(Meteor.call)('loginOrRegister', ...methodParams),
        promisify(Meteor.call)('loginOrRegister', ...methodParams)
      ])
        .then(([result1, result2]) => {
          expect(result1).to.equal(result2);
        });
    });
  });
});

describe('method validatePTTAccount', function() {
  const correctValidateCode = 'abcdefghij';
  const wrongValidateCode = 'zxcvbasdfg';

  const username = 'pttUser';
  const currentPassword = 'currentPassword';
  const newPassword = 'newPassword';

  beforeEach(function() {
    resetDatabase();
    sinon.stub(HTTP, 'get');
  });

  afterEach(function() {
    HTTP.get.restore();
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

    return promisify(Meteor.call)('validatePTTAccount', 'otherPttUser')
      .must.reject.with.an.error(Meteor.Error)
      .then(() => {
        expect(dbValidatingUsers.findOne({ username })).to.not.exist();
        expect(Accounts.findUserByUsername(username)).to.exist();
      });
  });

  describe('when the user does not exist', function() {
    it('should throw error if there is no pending validation for the user', function() {
      return promisify(Meteor.call)('validatePTTAccount', username)
        .must.reject.with.an.error(Meteor.Error);
    });

    describe('if the user has a pending validation', function() {
      beforeEach(function() {
        dbValidatingUsers.insert({
          username,
          password: currentPassword,
          validateCode: correctValidateCode,
          createdAt: new Date()
        });
      });

      it('should throw error if the validation code in the article does not match', function() {
        HTTP.get.returns({
          content: `
            <div class="push">
              <span class="push-userid">${username}</span>
              <span class="push-content">: ${wrongValidateCode}</span>
            </div>
          `
        });

        return promisify(Meteor.call)('validatePTTAccount', username)
          .must.reject.with.an.error(Meteor.Error);
      });

      it('should create a new user if the validation passed', function() {
        HTTP.get.returns({
          content: `
            <div class="push">
              <span class="push-userid">${username}</span>
              <span class="push-content">: ${correctValidateCode}</span>
            </div>
          `
        });

        expect(Accounts.findUserByUsername(username)).to.not.exist();

        return promisify(Meteor.call)('validatePTTAccount', username)
          .must.resolve.with.true()
          .then(() => {
            expect(Accounts.findUserByUsername(username)).to.exist();
          });
      });
    });
  });

  describe('when the user exists', function() {
    beforeEach(function() {
      Accounts.createUser({
        username,
        password: currentPassword,
        profile: {
          name: username,
          validateType: 'PTT'
        }
      });
    });

    it('should return true when there is no pending validation for the user', function() {
      return promisify(Meteor.call)('validatePTTAccount', username)
        .must.resolve.with.true();
    });

    describe('if the user has a pending validation', function() {
      beforeEach(function() {
        dbValidatingUsers.insert({
          username,
          password: newPassword,
          validateCode: correctValidateCode,
          createdAt: new Date()
        });
      });

      it('should return true even if the validation code in the article does not match', function() {
        HTTP.get.returns({
          content: `
            <div class="push">
              <span class="push-userid">${username}</span>
              <span class="push-content">: ${wrongValidateCode}</span>
            </div>
          `
        });

        return promisify(Meteor.call)('validatePTTAccount', username)
          .must.resolve.with.true();
      });
    });
  });
});

describe('method validateBahamutAccount', function() {
  it('pending');
});
