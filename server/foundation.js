'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { resourceManager } from './resourceManager';
import { dbFoundations } from '../db/dbFoundations';
import { dbLog } from '../db/dbLog';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbPrice } from '../db/dbPrice';
import { config } from '../config';

const {foundExpireTime, foundationNeedUsers, minReleaseStock} = config;
export function checkFoundCompany() {
  const foundExpireDate = new Date(Date.now() - foundExpireTime);
  dbFoundations
    .find(
      {
        createdAt: {
          $lt: foundExpireDate
        }
      },
      {
        fields: {
          _id: 1,
          companyName: 1
        },
        disableOplog: true
      }
    )
    .forEach((foundationData) => {
      const companyName = foundationData.companyName;
      //先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('checkFoundCompany', ['foundation' + companyName], (release) => {
        foundationData = dbFoundations.findOne({companyName});
        if (! foundationData) {
          release();

          return false;
        }
        const invest = foundationData.invest;
        if (invest.length >= foundationNeedUsers) {
          const invest = foundationData.invest;
          const totalInvest = _.reduce(invest, (sum, investData) => {
            return sum + investData.amount;
          }, 0);
          let stockUnitPrice = 1;
          while (Math.ceil(totalInvest / stockUnitPrice / 2) > minReleaseStock) {
            stockUnitPrice *= 2;
          }
          let directors;
          let totalRelease;
          do {
            directors = _.map(invest, ({username, amount}) => {
              const stocks = Math.floor(amount / stockUnitPrice);
              amount -= (stockUnitPrice * stocks);

              return {username, stocks, amount};
            });
            totalRelease = _.reduce(directors, (sum, directorData) => {
              return sum + directorData.stocks;
            }, 0);
            if (totalRelease < minReleaseStock) {
              stockUnitPrice /= 2;
            }
          }
          while (totalRelease < minReleaseStock);
          const createdAt = new Date();

          dbLog.insert({
            logType: '創立成功',
            username: _.union([foundationData.manager], _.pluck(invest, 'username')),
            companyName: companyName,
            price: stockUnitPrice,
            resolve: false,
            createdAt: createdAt
          });
          dbCompanies.insert({
            companyName: companyName,
            manager: foundationData.manager,
            chairmanTitle: '董事長',
            tags: foundationData.tags,
            pictureSmall: foundationData.pictureSmall,
            pictureBig: foundationData.pictureBig,
            description: foundationData.description,
            totalRelease: totalRelease,
            lastPrice: stockUnitPrice,
            listPrice: stockUnitPrice,
            totalValue: totalRelease * stockUnitPrice,
            profit: 0,
            candidateList: [foundationData.manager],
            voteList: [ [] ],
            createdAt: createdAt
          });
          dbPrice.insert({
            companyName: companyName,
            price: stockUnitPrice,
            createdAt: createdAt
          });
          dbFoundations.remove(foundationData._id);
          _.each(directors, ({username, stocks, amount}, index) => {
            const createdAt = new Date(Date.now() + index + 1);
            if (stocks > 0) {
              dbLog.insert({
                logType: '創立得股',
                username: [username],
                companyName: companyName,
                price: (stockUnitPrice * stocks) + amount,
                amount: stocks,
                resolve: false,
                createdAt: createdAt
              });
              dbDirectors.insert({companyName, username, stocks, createdAt});
            }
            if (amount > 0) {
              dbLog.insert({
                logType: '創立退款',
                username: [username],
                companyName: companyName,
                amount: amount,
                resolve: false,
                createdAt: new Date(createdAt.getTime() + 1)
              });
              Meteor.users.update({username}, {
                $inc: {
                  'profile.money': amount
                }
              });
            }
          });
        }
        else {
          dbLog.insert({
            logType: '創立失敗',
            username: _.union([foundationData.manager], _.pluck(invest, 'username')),
            companyName: companyName,
            resolve: false,
            createdAt: new Date()
          });
          dbFoundations.remove(foundationData._id);
          _.each(foundationData.invest, ({username, amount}, index) => {
            const createdAt = new Date(Date.now() + index + 1);
            dbLog.insert({
              logType: '創立退款',
              username: [username],
              companyName: companyName,
              amount: amount,
              resolve: false,
              createdAt: createdAt
            });
            Meteor.users.update({username}, {
              $inc: {
                'profile.money': amount
              }
            });
          });
        }
        release();
      });
    });
}

