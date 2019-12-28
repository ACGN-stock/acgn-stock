import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import expect from 'must';
import faker from 'faker';

import { editUserAbout } from '/server/methods/accounts/editUserAbout';
import { pttUserFactory } from '/dev-utils/factories';

describe('method editUserAbout', function() {
  this.timeout(10000);

  let userId;
  let description = '';
  let picture = '';

  beforeEach(function() {
    resetDatabase();

    userId = Accounts.createUser(pttUserFactory.build());
    description = faker.random.words();
    picture = faker.image.avatar();
  });

  const runEditUserAbout = () => {
    return editUserAbout.bind(null, userId, { description, picture });
  };

  it('should fail if the user is not exist', function() {
    Meteor.users.remove({});

    runEditUserAbout().must.throw(Meteor.Error, `找不到識別碼為「${userId}」的使用者！ [404]`);
  });

  it('should fail if the user is been banned edit user about', function() {
    Meteor.users.update(userId, { $addToSet: { 'profile.ban': 'editUserAbout' } });

    runEditUserAbout().must.throw(Meteor.Error, `您現在被金融管理會禁止了編輯個人簡介！ [403]`);
  });

  it('should fail if picture is not valid url', function() {
    picture = faker.lorem.words().replace(/ /g, '');

    runEditUserAbout().must.throw(Meteor.Error, `「${picture}」並非合法的網址！ [403]`);
  });

  it(`should success update user.about`, function() {
    runEditUserAbout().must.not.throw();

    const user = Meteor.users.findOne(userId);
    expect(user.about).to.eql({ description, picture });
  });
});
