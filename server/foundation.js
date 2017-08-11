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
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
  const priceBulk = dbPrice.rawCollection().initializeUnorderedBulkOp();
  const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
  let haveSuccessFoundations = false;
  let haveFailFoundations = false;
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
          companyName: 1,
          invest: 1
        },
        disableOplog: true
      }
    )
    .forEach((foundationData) => {
      const companyName = foundationData.companyName;
      const invest = foundationData.invest;
      if (invest.length >= foundationNeedUsers) {
        //先鎖定資源，再重新讀取一次資料進行運算
        resourceManager.request('checkFoundCompany', ['foundation' + companyName], (release) => {
          const foundationData = dbFoundations.findOne({companyName});
          if (! foundationData) {
            release();

            return false;
          }
          const invest = foundationData.invest;
          const totalInvest = _.reduce(invest, (sum, investData) => {
            return sum + investData.amount;
          }, 0);
          const shouldReleaseStocks = Math.max(minReleaseStock, Math.floor(totalInvest / 10));
          const sortedInvest = _.sortBy(invest, 'amount').reverse();
          const directors = _.map(sortedInvest, ({username, amount}) => {
            const stocks = Math.ceil(amount / totalInvest * shouldReleaseStocks);

            return {username, stocks};
          });
          const totalRelease = _.reduce(directors, (sum, directorData) => {
            return sum + directorData.stocks;
          }, 0);
          const lastPrice = Math.round(totalInvest / totalRelease);
          const createdAt = new Date();

          haveSuccessFoundations = true;
          logBulk.insert({
            logType: '創立成功',
            username: [foundationData.manager].concat(_.pluck(sortedInvest, 'username')),
            companyName: companyName,
            price: lastPrice,
            resolve: false,
            createdAt: createdAt
          });
          companiesBulk.insert({
            companyName: companyName,
            manager: foundationData.manager,
            chairmanTitle: '董事長',
            tags: foundationData.tags,
            pictureSmall: foundationData.pictureSmall,
            pictureBig: foundationData.pictureBig,
            description: foundationData.description,
            totalRelease: totalRelease,
            lastPrice: lastPrice,
            listPrice: lastPrice,
            totalValue: totalRelease * lastPrice,
            profit: 0,
            candidateList: [foundationData.manager],
            voteList: [ [] ],
            createdAt: createdAt
          });
          priceBulk.insert({
            companyName: companyName,
            price: lastPrice,
            createdAt: createdAt
          });
          dbFoundations.remove(foundationData._id);
          _.each(directors, ({username, stocks}) => {
            logBulk.insert({
              logType: '創立得股',
              username: [username],
              companyName: companyName,
              amount: stocks,
              resolve: false,
              createdAt: createdAt
            });
            directorsBulk.insert({companyName, username, stocks, createdAt});
          });
          release();
        });
      }
      else {
        //先鎖定資源，再重新讀取一次資料進行運算
        resourceManager.request('checkFoundCompany', ['foundation' + companyName], (release) => {
          const foundationData = dbFoundations.findOne({companyName}, {
            fields: {
              _id: 1,
              manager: 1,
              invest: 1
            }
          });
          if (! foundationData) {
            release();

            return false;
          }
          logBulk.insert({
            logType: '創立失敗',
            username: [foundationData.manager].concat(_.pluck(invest, 'username')),
            companyName: companyName,
            resolve: false,
            createdAt: new Date()
          });
          dbFoundations.remove(foundationData._id);
          _.each(foundationData.invest, ({username, amount}) => {
            haveFailFoundations = true;
            usersBulk
              .find({username})
              .updateOne({
                $inc: {
                  'profile.money': amount
                }
              });
          });
          release();
        });
      }
    });
  if (haveSuccessFoundations || haveFailFoundations) {
    logBulk.execute();
    if (haveSuccessFoundations) {
      companiesBulk.execute();
      priceBulk.execute();
      directorsBulk.execute();
    }
    if (haveFailFoundations) {
      usersBulk.execute();
    }
  }
}

