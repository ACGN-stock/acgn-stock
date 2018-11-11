import { Meteor } from 'meteor/meteor';

export function clearAllUserProductVouchers() {
  Meteor.users.update({}, {
    $set: {
      'profile.vouchers': 0
    }
  }, { multi: true });
}
