import { Meteor } from 'meteor/meteor';

import { dbLog } from '/db/dbLog';
import { dbSeason } from '/db/dbSeason';
import { threadId } from '../threading/thread';

export const loginObserver = {
  //開始觀察以處理登入IP紀錄、未登入天數
  start() {
    if (! this._observer) {
      console.log('start observer login info at ' + threadId + ' ' + Date.now());
      this._observer = Meteor.users
        .find(
          {},
          {
            fields: {
              _id: 1,
              'status.lastLogin.date': 1,
              'status.lastLogin.ipAddr': 1
            },
            disableOplog: true
          }
        )
        .observe({
          changed: (newUserData, oldUserData) => {
            const previousLoginData = (oldUserData.status && oldUserData.status.lastLogin) || {
              date: new Date()
            };
            const nextLoginData = (newUserData.status && newUserData.status.lastLogin) || {
              date: new Date()
            };
            if (nextLoginData.ipAddr && nextLoginData.ipAddr !== previousLoginData.ipAddr) {
              dbLog.insert({
                logType: '登入紀錄',
                userId: [newUserData._id],
                data: { ipAddr: nextLoginData.ipAddr },
                createdAt: new Date()
              });
            }
            if (nextLoginData.date.getTime() !== previousLoginData.date.getTime()) {
              let lastSeasonData = dbSeason.findOne({}, {
                sort: {
                  beginDate: -1
                }
              });
              lastSeasonData = lastSeasonData || {
                beginDate: new Date()
              };
              const seasonBeginTime = lastSeasonData.beginDate.getTime();
              const nextLoginTime = nextLoginData.date.getTime() - seasonBeginTime;
              const previousLoginTime = Math.max(previousLoginData.date.getTime(), seasonBeginTime) - seasonBeginTime;

              const noLoginDay = Math.ceil(nextLoginTime / 86400000) - Math.ceil(previousLoginTime / 86400000) - 1;
              if (noLoginDay > 0) {
                Meteor.users.update(newUserData._id, {
                  $set: {
                    'status.lastLogin.date': nextLoginData.date
                  },
                  $inc: {
                    'profile.noLoginDayCount': Math.min(noLoginDay, 6)
                  }
                });
              }
            }
          }
        });
    }
  },
  //停止觀察處理登入IP紀錄、未登入天數
  stop() {
    if (this._observer) {
      console.log('stop observer login info at ' + threadId + ' ' + Date.now());
      this._observer.stop();
      this._observer = null;
    }
  }
};
