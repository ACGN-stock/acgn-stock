import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbEmployees } from '/db/dbEmployees';
import { dbLog } from '/db/dbLog';
import { debug } from '/server/imports/utils/debug';

//當商業季度結束時，結算所有公司的營利額並按照股權分給股東。
export function giveBonusByStocksFromProfit() {
  debug.log('giveBonusByStocksFromProfit');
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  let needExecuteLogBulk = false;
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  let needExecuteUserBulk = false;
  dbCompanies
    .find(
      {
        profit: {
          $gt: 0
        },
        isSeal: false
      },
      {
        fields: {
          _id: 1,
          manager: 1,
          totalRelease: 1,
          profit: 1,
          seasonalBonusPercent: 1
        },
        disableOplog: true
      }
    )
    .forEach((companyData) => {
      const now = Date.now();
      const companyId = companyData._id;
      let leftProfit = companyData.profit;
      logBulk.insert({
        logType: '公司營利',
        companyId: companyId,
        data: { profit: leftProfit },
        createdAt: new Date(now)
      });
      needExecuteLogBulk = true;
      //經理人分紅
      if (companyData.manager !== '!none') {
        const userData = Meteor.users.findOne(companyData.manager, {
          fields: {
            'profile.ban': 1,
            'profile.isInVacation': 1,
            'profile.lastVacationStartDate': 1,
            'status.lastLogin.date': 1
          }
        });
        if (
          // 非當季開始放假者不分紅
          userData.profile && (! userData.profile.isInVacation || now - userData.profile.lastVacationStartDate.getTime() <= Meteor.settings.public.seasonTime) &&
          //被禁止交易者不分紅
          userData.profile && ! _.contains(userData.profile.ban, 'deal') &&
          //七天未動作者不分紅
          userData.status && now - userData.status.lastLogin.date.getTime() <= 604800000
        ) {
          const managerProfit = Math.ceil(leftProfit * Meteor.settings.public.managerProfitPercent);
          logBulk.insert({
            logType: '營利分紅',
            userId: [companyData.manager],
            companyId: companyId,
            data: { bonus: managerProfit },
            createdAt: new Date(now + 1)
          });
          usersBulk
            .find({
              _id: companyData.manager
            })
            .updateOne({
              $inc: {
                'profile.money': managerProfit
              }
            });
          needExecuteUserBulk = true;
          leftProfit -= managerProfit;
        }
      }
      //員工分紅
      const employeeList = [];
      dbEmployees.find({
        companyId: companyId,
        employed: true
      }).forEach((employee) => {
        const userData = Meteor.users.findOne(employee.userId, {
          fields: {
            'profile.ban': 1,
            'profile.isInVacation': 1,
            'profile.lastVacationStartDate': 1,
            'status.lastLogin.date': 1
          }
        });

        if (! userData || ! userData.profile || ! userData.status) {
          return;
        }

        // 非當季開始放假者不分紅
        if (userData.profile.isInVacation && now - userData.profile.lastVacationStartDate.getTime() > Meteor.settings.public.seasonTime) {
          return;
        }

        //被禁止交易者不分紅
        if (_.contains(userData.profile.ban, 'deal')) {
          return true;
        }

        //七天未動作者不分紅
        if (now - userData.status.lastLogin.date.getTime() > 604800000) {
          return true;
        }

        employeeList.push(employee.userId);
      });
      if (employeeList.length > 0) {
        const totalBonus = companyData.profit * companyData.seasonalBonusPercent * 0.01;
        const bonus = Math.floor(totalBonus / employeeList.length);
        _.each(employeeList, (userId, index) => {
          logBulk.insert({
            logType: '營利分紅',
            userId: [userId],
            companyId: companyId,
            data: { bonus },
            createdAt: new Date(now + 2 + index)
          });
          usersBulk
            .find({
              _id: userId
            })
            .updateOne({
              $inc: {
                'profile.money': bonus
              }
            });
        });
        leftProfit -= bonus * employeeList.length;
        needExecuteUserBulk = true;
      }
      //剩餘收益先扣去公司營運成本
      leftProfit -= Math.ceil(companyData.profit * Meteor.settings.public.costFromProfit);
      const forDirectorProfit = leftProfit;
      //取得所有能夠領取紅利的董事userId與股份比例
      let canReceiveProfitStocks = 0;
      const canReceiveProfitDirectorList = [];
      dbDirectors
        .find({companyId}, {
          sort: {
            stocks: -1,
            createdAt: 1
          },
          fields: {
            userId: 1,
            stocks: 1
          }
        })
        .forEach((directorData) => {
          //系統及金管會不分紅
          if (directorData.userId === '!system' || directorData.userId === '!FSC') {
            return true;
          }
          const userData = Meteor.users.findOne(directorData.userId, {
            fields: {
              'profile.ban': 1,
              'profile.noLoginDayCount': 1,
              'profile.isInVacation': 1,
              'profile.lastVacationStartDate': 1,
              'status.lastLogin.date': 1
            }
          });
          const { profile: userProfile, status: userStatus } = userData;
          if (! userProfile || ! userStatus || ! userStatus.lastLogin || ! userStatus.lastLogin.date) {
            return true;
          }
          const lastLoginDate = userStatus.lastLogin.date;

          const oneDayMs = 86400000;
          const noLoginTime = now - lastLoginDate.getTime();
          const noLoginDay = Math.min(Math.floor(noLoginTime / oneDayMs), 7);
          const noLoginDayCount = Math.min(noLoginDay + (userProfile.noLoginDayCount || 0), Math.floor(Meteor.settings.public.seasonTime / oneDayMs));

          // 非當季開始放假者不分紅
          if (userData.profile.isInVacation && now - userData.profile.lastVacationStartDate.getTime() > Meteor.settings.public.seasonTime) {
            return;
          }

          //被禁止交易者不分紅
          if (_.contains(userProfile.ban, 'deal')) {
            return true;
          }

          //七天未動作者不分紅
          if (noLoginTime > 7 * oneDayMs) {
            return true;
          }

          // 未上線天數 >= 5 者，持有股份以 0% 計，故直接排除分紅
          if (noLoginDayCount >= 5) {
            return true;
          }

          // 未上線天數 4 天者，持有股份以 50% 計，其餘則以 100% 計
          const effectiveStocksFactor = noLoginDayCount === 4 ? 0.5 : 1;
          const effectiveStocks = Math.round(effectiveStocksFactor * directorData.stocks);

          canReceiveProfitStocks += effectiveStocks;
          canReceiveProfitDirectorList.push({
            userId: directorData.userId,
            stocks: effectiveStocks
          });
        });
      _.each(canReceiveProfitDirectorList, (directorData, index) => {
        const directorProfit = Math.min(Math.ceil(forDirectorProfit * directorData.stocks / canReceiveProfitStocks), leftProfit);
        if (directorProfit > 0) {
          logBulk.insert({
            logType: '營利分紅',
            userId: [directorData.userId],
            companyId: companyId,
            data: { bonus: directorProfit },
            createdAt: new Date(now + 3 + employeeList.length + index)
          });
          usersBulk
            .find({
              _id: directorData.userId
            })
            .updateOne({
              $inc: {
                'profile.money': directorProfit
              }
            });
          needExecuteUserBulk = true;
          leftProfit -= directorProfit;
        }
      });
    });
  if (needExecuteLogBulk) {
    logBulk.execute();
  }
  if (needExecuteUserBulk) {
    usersBulk.execute();
  }
}
