'use strict';
import { Meteor } from 'meteor/meteor';
import { config } from '../config';
import { dbLog } from '../db/dbLog';

const {salaryPerPay, paySalaryCounter} = config;
let counter = paySalaryCounter;
export function paySalary() {
  counter -= 1;
  if (counter <= 0) {
    counter = paySalaryCounter;
    console.info(new Date().toLocaleString() + ': paySalary');
    const now = new Date();
    Meteor.users.update(
      {
        createdAt: {
          $lte: now
        }
      },
      {
        $inc: {
          'profile.money': salaryPerPay
        }
      },
      {
        multi: true
      }
    );
    dbLog.insert({
      logType: '發薪紀錄',
      username: ['!all'],
      price: salaryPerPay,
      createdAt: now
    });
  }
}
