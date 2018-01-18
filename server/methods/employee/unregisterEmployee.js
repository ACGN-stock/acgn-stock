import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import { dbEmployees } from '/db/dbEmployees';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  unregisterEmployee() {
    check(this.userId, String);
    unregisterEmployee(Meteor.user());

    return true;
  }
});
export function unregisterEmployee(user) {
  debug.log('unregisterEmployee', { user });
  const userId = user._id;
  const employed = false;
  const resigned = false;
  dbEmployees.remove({ userId, employed, resigned });
}
limitMethod('unregisterEmployee');
