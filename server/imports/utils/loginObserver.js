import { Meteor } from 'meteor/meteor';

import { dbLog } from '/db/dbLog';
import { getCurrentSeason } from '/db/dbSeason';
import { getCurrentRound } from '/db/dbRound';
import { threadId } from '../threading/thread';

function createUserLoginLog({ userId, ipAddr, loginDate }) {
  dbLog.insert({
    logType: '登入紀錄',
    userId: [userId],
    data: { ipAddr },
    createdAt: loginDate
  });
}

export const loginObserver = {
  // 開始觀察以處理登入IP紀錄、未登入天數
  start() {
    if (! this._observer) {
      console.log(`start observer login info at ${threadId}`);
      this._observer = Meteor.users
        .find({}, {
          fields: {
            _id: 1,
            'status.lastLogin.date': 1,
            'status.lastLogin.ipAddr': 1
          },
          disableOplog: true
        })
        .observe({
          added(userData) {
            const { _id: userId, status: userStatus } = userData;
            const { ipAddr: lastIpAddr, date: lastLoginDate } = (userStatus && userStatus.lastLogin) || {};

            // 從未登入過者，不需處理
            if (! lastLoginDate || ! lastIpAddr) {
              return;
            }

            const { beginDate: roundBeginDate } = getCurrentRound();
            const lastLoginLog = dbLog.findOne({
              logType: '登入紀錄',
              userId,
              createdAt: { $gte: roundBeginDate }
            }, { sort: { createdAt: -1 } });

            // 本賽季登入過卻未有紀錄者，補上紀錄
            if (! lastLoginLog) {
              createUserLoginLog({ userId, ipAddr: lastIpAddr, loginDate: lastLoginDate });
            }
          },
          changed(newUserData, oldUserData) {
            const { _id: userId, status: newUserStatus } = newUserData;
            const { status: oldUserStatus } = oldUserData;

            const { ipAddr: newIpAddr, date: newLoginDate } = (newUserStatus && newUserStatus.lastLogin) || { date: new Date() };
            const { ipAddr: oldIpAddr, date: oldLoginDate } = (oldUserStatus && oldUserStatus.lastLogin) || { date: new Date() };

            // IP 有變動者，新增紀錄
            if (newIpAddr && newIpAddr !== oldIpAddr) {
              createUserLoginLog({ userId, ipAddr: newIpAddr, loginDate: newLoginDate });
            }

            // 登入時間變動時，處理未登入天數計算
            if (newLoginDate.getTime() !== oldLoginDate.getTime()) {
              const { beginDate: seasonBeginDate } = getCurrentSeason() || { beginDate: new Date() };
              const seasonBeginTime = seasonBeginDate.getTime();

              // 計算本次與上次登入時間的位移（相對於商業季度開始時間）
              const currentLoginTimeOffset = newLoginDate.getTime() - seasonBeginTime;
              const previousLoginTimeOffset = Math.max(oldLoginDate.getTime() - seasonBeginTime, 0);

              // 計算本次與上次登入在商業季度的第幾天
              const currentLoginDay = Math.ceil(currentLoginTimeOffset / 86400000);
              const previousLoginDay = Math.ceil(previousLoginTimeOffset / 86400000);

              // 計算未登入天數
              const noLoginDayCount = Math.min(currentLoginDay - previousLoginDay - 1, 6);

              if (noLoginDayCount > 0) {
                Meteor.users.update(userId, { $inc: { 'profile.noLoginDayCount': noLoginDayCount } });
              }
            }
          }
        });
    }
  },
  // 停止觀察處理登入IP紀錄、未登入天數
  stop() {
    if (this._observer) {
      console.log('stop observer login info at ' + threadId + ' ' + Date.now());
      this._observer.stop();
      this._observer = null;
    }
  }
};
