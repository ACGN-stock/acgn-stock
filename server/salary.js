'use strict';
import { Meteor } from 'meteor/meteor';
import { tx } from 'meteor/babrahams:transactions';
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
    dbLog.insert({
      logType: '發薪紀錄',
      username: [user.username],
      price: beginSalary
    }, {
      tx: true
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
    }, {
      tx: true
    });
  });
  counter -= 1;
  if (counter === 0) {
    tx.start('發薪紀錄');
    Meteor.users.find({}, {disableOplog: true}).forEach((user) => {
      dbLog.insert({
        logType: '發薪紀錄',
        username: [user.username],
        price: salaryPerPay
      }, {
        tx: true
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
      }, {
        tx: true
      });
    });
    tx.commit();
    counter = paySalaryCounter;
  }
}
