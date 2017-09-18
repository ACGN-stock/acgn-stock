'use strict';
import { Meteor } from 'meteor/meteor';
import { config } from '../config';
import { dbLog } from '../db/dbLog';
import { dbVariables } from '../db/dbVariables';
import { debug } from './debug';

const {salaryPerPay} = config;
export function paySalary() {
  debug.log('paySalary');
  const todayBeginTime = new Date().setHours(0, 0, 0, 0);
  const lastPayTime = dbVariables.get('lastPayTime');
  if (! lastPayTime || lastPayTime.setHours(0, 0, 0, 0) !== todayBeginTime) {
    const thisPayTime = new Date();
    dbVariables.set('lastPayTime', thisPayTime);
    console.info(thisPayTime.toLocaleString() + ': paySalary');
    Meteor.users.update(
      {
        createdAt: {
          $lte: thisPayTime
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
      userId: ['!all'],
      price: salaryPerPay,
      createdAt: thisPayTime
    });
  }
}
