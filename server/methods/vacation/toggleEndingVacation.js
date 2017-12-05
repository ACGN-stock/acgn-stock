import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  toggleEndingVacation() {
    check(this.userId, String);

    return toggleEndingVacation(this.userId);
  }
});
export function toggleEndingVacation(userId) {
  debug.log('toggleEndingVacation', userId);

  const user = Meteor.users.findOne({ _id: userId });
  if (! user) {
    throw new Meteor.Error(404, `找不到識別碼為 ${userId} 的使用者！`);
  }

  if (! user.profile.isInVacation) {
    throw new Meteor.Error(403, '您並非處於渡假狀態！');
  }

  Meteor.users.update({ _id: userId }, { $set: { 'profile.isEndingVacation': ! user.profile.isEndingVacation } });

  return ! user.profile.isEndingVacation;
}
