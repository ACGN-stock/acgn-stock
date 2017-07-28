'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { lockManager } from '../lockManager';
import { dbFoundations } from '../db/dbFoundations';
import { dbLog } from '../db/dbLog';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbPrice } from '../db/dbPrice';
import { config } from '../config';

const {foundExpireTime, foundationNeedUsers, beginReleaseStock} = config;
export function checkFoundCompany() {
  const foundExpireDate = new Date(Date.now() - foundExpireTime);
  dbFoundations
    .find({
      createdAt: {
        $lt: foundExpireDate
      }
    }, {
      disableOplog: true
    })
    .forEach((foundationData) => {
      const invest = foundationData.invest;
      const companyName = foundationData.companyName;
      const unlock = lockManager.lock([companyName], true);
      if (invest.length < foundationNeedUsers) {
        dbLog.insert({
          logType: '創立失敗',
          username: [foundationData.manager].concat(_.pluck(invest, 'username')),
          companyName: companyName,
          createdAt: new Date()
        });
        dbFoundations.remove({
          _id: foundationData._id
        });
        _.each(invest, ({username, amount}) => {
          Meteor.users.update({username}, {
            $inc: {
              'profile.money': amount
            }
          });
        });
      }
      else {
        const totalInvest = _.reduce(invest, (sum, investData) => {
          return sum + investData.amount;
        }, 0);
        const sortedInvest = _.sortBy(invest, 'amount').reverse();
        const directors = _.map(sortedInvest, ({username, amount}) => {
          const stocks = Math.round(amount / totalInvest * beginReleaseStock) || 1;

          return {username, stocks};
        });
        const totalRelease = _.reduce(directors, (sum, directorData) => {
          return sum + directorData.stocks;
        }, 0);
        const lastPrice = Math.round(totalInvest / totalRelease);
        const createdAt = new Date();

        dbLog.insert({
          logType: '創立成功',
          username: [foundationData.manager].concat(_.pluck(sortedInvest, 'username')),
          companyName: companyName,
          price: lastPrice,
          createdAt: createdAt
        });
        dbCompanies.insert({
          companyName: companyName,
          manager: foundationData.manager,
          tags: foundationData.tags,
          puctureSmall: foundationData.puctureSmall,
          puctureBig: foundationData.puctureBig,
          description: foundationData.description,
          totalRelease: totalRelease,
          lastPrice: lastPrice,
          totalValue: totalRelease * lastPrice,
          candidateList: [foundationData.manager],
          createdAt: createdAt
        });
        dbPrice.insert({
          companyName: companyName,
          price: lastPrice,
          createdAt: createdAt
        });
        dbFoundations.remove({
          _id: foundationData._id
        });
        _.each(directors, ({username, stocks}) => {
          dbLog.insert({
            logType: '創立得股',
            username: [username],
            companyName: companyName,
            amount: stocks,
            createdAt: createdAt
          });
          dbDirectors.insert({companyName, username, stocks, createdAt});
        });
      }
      unlock();
    })
}

