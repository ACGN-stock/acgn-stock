import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { HTTP } from 'meteor/http';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { promisify } from 'util';
import expect from 'must';
import mustSinon from 'must-sinon';
import sinon from 'sinon';

import { dbValidatingUsers } from '/db/dbValidatingUsers';

import '/server/methods/accounts/validateBahamutAccount';

mustSinon(expect);

describe('method validateBahamutAccount', function() {
  this.timeout(10000);

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
