'use strict';
import { Meteor } from 'meteor/meteor';
import { lockManager } from '../methods/lockManager';
import { config } from '../config';
import { dbLog } from '../db/dbLog';

const {beginSalary, salaryPerPay, paySalaryCounter} = config;
let counter = paySalaryCounter;
export function paySalary() {
  const now = new Date();
  Meteor.users.find({
    lastPayDay: new Date(0)
  }, {
    disableOplog: true
  }).forEach((user) => {
    const unlock = lockManager.lock([user._id], true);
    dbLog.insert({
      logType: '發薪紀錄',
      username: [user.username],
      price: beginSalary
    });
    Meteor.users.update({
      _id: user._id
    }, {
      $set: {
        lastPayDay: now
      },
      $inc: {
        'profile.money': beginSalary
      }
    });
    unlock();
  });
  counter -= 1;
  if (counter === 0) {
    Meteor.users.find({}, {disableOplog: true}).forEach((user) => {
      const unlock = lockManager.lock([user._id], true);
      dbLog.insert({
        logType: '發薪紀錄',
        username: [user.username],
        price: salaryPerPay
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
