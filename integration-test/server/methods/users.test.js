import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { HTTP } from 'meteor/http';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { promisify } from 'util';
import expect from 'must';
import mustSinon from 'must-sinon';
import sinon from 'sinon';

import { dbValidatingUsers } from '/db/dbValidatingUsers';

import '/server/methods/users';

mustSinon(expect);

describe('method loginOrRegister', function() {
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

describe('method validatePTTAccount', function() {
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

describe('method validateBahamutAccount', function() {
  function validateBahamutAccount(username) {
    return promisify(Meteor.call)('validateBahamutAccount', username);
  }

  const correctValidateCode = 'abcdefghij';
  const wrongValidateCode = 'zxcvbasdfg';

  const username = 'bahamutUser';
  const checkUsername = `?${username}`;
  const currentPassword = 'currentPassword';
  const newPassword = 'newPassword';

  const homeIndexUrl = `https://home.gamer.com.tw/homeindex.php?owner=${username}`;
  const homeReplyListUrl = `https://home.gamer.com.tw/homeReplyList.php?owner=${username}`;

  beforeEach(function() {
    resetDatabase();
    sinon.stub(HTTP, 'get');
    sinon.spy(Accounts, 'setPassword');
  });

  afterEach(function() {
    HTTP.get.restore();
    Accounts.setPassword.restore();
  });

  describe('without pending validation', function() {
    it('should throw error if the user does not exist', function() {
      return validateBahamutAccount(username).must.reject.with.an.error(Meteor.Error);
    });

    it('should return true if the user exists', function() {
      Accounts.createUser({
        username: checkUsername,
        password: currentPassword,
        profile: {
          name: username,
          validateType: 'Bahamut'
        }
      });

      return validateBahamutAccount(username).must.resolve.with.true();
    });
  });

  describe('with pending validation', function() {
    beforeEach(function() {
      dbValidatingUsers.insert({
        username: checkUsername,
        password: newPassword,
        validateCode: correctValidateCode,
        createdAt: new Date()
      });
    });

    it('should throw error if the user does not have phone validation info', function() {
      HTTP.get.withArgs(homeIndexUrl).returns({ content: '' });

      return validateBahamutAccount(username).must.reject.with.an.error(Meteor.Error);
    });

    it('should throw error if the user has passed phone validation but no validatation code reply found', function() {
      HTTP.get
        .withArgs(homeIndexUrl)
        .returns({ content: '<li>手機認證：有</li>' })
        .withArgs(homeReplyListUrl)
        .returns({ content: '' });

      return validateBahamutAccount(username).must.reject.with.an.error(Meteor.Error);
    });

    it('should throw error if the user has passed phone validation but replied wrong validatation code', function() {
      HTTP.get
        .withArgs(homeIndexUrl)
        .returns({ content: '<li>手機認證：有</li>' })
        .withArgs(homeReplyListUrl)
        .returns({ content: `<span><a href="home.php?owner=${username}"></a>：${wrongValidateCode}</span>` });

      return validateBahamutAccount(username).must.reject.with.an.error(Meteor.Error);
    });

    it('should create a new user if the validation process passed and the user does not exist', function() {
      HTTP.get
        .withArgs(homeIndexUrl)
        .returns({ content: '<li>手機認證：有</li>' })
        .withArgs(homeReplyListUrl)
        .returns({ content: `<span><a href="home.php?owner=${username}"></a>：${correctValidateCode}</span>` });

      return validateBahamutAccount(username).must.resolve.with.true()
        .then(() => {
          expect(Meteor.users.findOne({ username: checkUsername })).to.exist();
        });
    });

    it('should reset password if the validation process passed and the user already exists', function() {
      Accounts.createUser({
        username: checkUsername,
        password: currentPassword,
        profile: {
          name: username,
          validateType: 'Bahamut'
        }
      });

      HTTP.get
        .withArgs(homeIndexUrl)
        .returns({ content: '<li>手機認證：有</li>' })
        .withArgs(homeReplyListUrl)
        .returns({ content: `<span><a href="home.php?owner=${username}"></a>：${correctValidateCode}</span>` });

      return validateBahamutAccount(username).must.resolve.with.true()
        .then(() => {
          const { _id: userId } = Meteor.users.findOne({ username: checkUsername });
          Accounts.setPassword.must.have.been.calledWith(userId, newPassword);
        });
    });
  });
});
