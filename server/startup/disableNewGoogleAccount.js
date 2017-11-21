import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';

Accounts.validateNewUser((user) => {
  if (user.services && user.services.google) {
    throw new Meteor.Error(403, '暫時停止以Google帳號進行註冊！');
  }

  return true;
});
