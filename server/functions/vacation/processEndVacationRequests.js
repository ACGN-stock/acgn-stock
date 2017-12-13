import { Meteor } from 'meteor/meteor';

// 處理所有使用者的收假要求
export function processEndVacationRequests() {
  Meteor.users.update({
    'profile.isInVacation': true,
    'profile.isEndingVacation': true
  }, {
    $set: {
      'profile.isInVacation': false,
      'profile.isEndingVacation': false
    }
  }, {
    multi: true
  });
}
