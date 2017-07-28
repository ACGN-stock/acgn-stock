'use strict';
import { Meteor } from 'meteor/meteor';
import { lockManager } from '../lockManager';
import { config } from '../config';
import { dbLog } from '../db/dbLog';

const {salaryPerPay, paySalaryCounter} = config;
let counter = paySalaryCounter;
export function paySalary() {
  counter -= 1;
  if (counter === 0) {
    const now = new Date();
    Meteor.users.find({}, {disableOplog: true}).forEach((user) => {
      const unlock = lockManager.lock([user._id], true);
      dbLog.insert({
        logType: '發薪紀錄',
        username: [user.username],
        price: salaryPerPay,
        createdAt: new Date()
      });
      Meteor.users.update({
        _id: user._id
      }, {
        $set: {
          lastPayDay: now
        },
        $inc: {
          'profile.money': salaryPerPay
        }
      });
      unlock();
    });
    counter = paySalaryCounter;
  }
}
