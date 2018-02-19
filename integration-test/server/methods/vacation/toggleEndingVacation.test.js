import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { toggleEndingVacation } from '/server/methods/vacation/toggleEndingVacation';

mustSinon(expect);

describe('method toggleEndingVacation', function() {
  this.timeout(10000);

  const userData = {
    username: 'someone',
    password: 'mypass',
    profile: {
      name: 'someone',
      validateType: 'PTT'
    }
  };

  let userId;

  beforeEach(function() {
    resetDatabase();
    userId = Accounts.createUser(userData);
  });

  it('should fail if the user is not in vacation', function() {
    Meteor.users.update({ _id: userId }, { $set: { 'profile.isInVacation': false } });
    toggleEndingVacation.bind(null, userId).must.throw(Meteor.Error, '您並非處於渡假狀態！ [403]');
  });

  it('should mark the user as being ending vacation if the user has not been marked', function() {
    Meteor.users.update({ _id: userId }, {
      $set: {
        'profile.isInVacation': true,
        'profile.isEndingVacation': false
      }
    });
    toggleEndingVacation(userId).must.be.true();
    Meteor.users.findOne(userId).profile.isEndingVacation.must.be.true();
  });

  it('should unmark the user from being ending vacation if the user has been marked', function() {
    Meteor.users.update({ _id: userId }, {
      $set: {
        'profile.isInVacation': true,
        'profile.isEndingVacation': true
      }
    });
    toggleEndingVacation(userId).must.be.false();
    Meteor.users.findOne(userId).profile.isEndingVacation.must.be.false();
  });
});
