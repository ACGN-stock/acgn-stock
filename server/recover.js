import { Meteor } from 'meteor/meteor';
import taxList from './writeUserIdList.json';

taxList.forEach((taxData) => {
  if (taxData.money > 0) {
    Meteor.users.update(taxData.userId, {
      $inc: {
        'profile.money': taxData.needPay
      }
    });
  }
});