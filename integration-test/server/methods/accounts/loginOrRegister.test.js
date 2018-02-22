import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { promisify } from 'util';
import expect from 'must';
import mustSinon from 'must-sinon';

import { dbValidatingUsers } from '/db/dbValidatingUsers';

import '/server/methods/accounts/loginOrRegister';

mustSinon(expect);

describe('method loginOrRegister', function() {
  this.timeout(10000);

  function loginOrRegister(params) {
    return promisify(Meteor.call)('loginOrRegister', params);
  }

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
      return loginOrRegister({
        username: userData.username,
        password: userData.password,
        type: userData.profile.validateType,
        reset: false
      }).must.resolve.to.be.true();
    });

    it('should return a validation code and save the user data to validatingUsers when the user wants to reset the password', function() {
      const newPassword = 'newPassword';

      return loginOrRegister({
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
      return loginOrRegister({
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
      const params = {
        username: userData.username,
        password: userData.password,
        type: userData.profile.validateType,
        reset: false
      };

      return Promise.all([
        loginOrRegister(params),
        loginOrRegister(params)
      ])
        .then(([result1, result2]) => {
          expect(result1).to.equal(result2);
        });
    });

    it('should return the same validation code across different calls with different passwords', function() {
      const params1 = {
        username: userData.username,
        password: 'password1',
        type: userData.profile.validateType,
        reset: false
      };

      const params2 = {
        username: userData.username,
        password: 'password2',
        type: userData.profile.validateType,
        reset: false
      };

      return Promise.all([
        loginOrRegister(params1),
        loginOrRegister(params2)
      ])
        .then(([result1, result2]) => {
          expect(result1).to.equal(result2);
        });
    });
  });
});
