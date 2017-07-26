'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { lockManager } from '../methods/lockManager';
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
      const name = foundationData.name;
      const unlock = lockManager.lock([name], true);
      if (invest.length < foundationNeedUsers) {
        dbLog.insert({
          logType: '創立失敗',
          username: [foundationData.manager].concat(_.pluck(invest, 'username')),
          companyName: name,
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
          companyName: name,
          price: lastPrice,
          createdAt: createdAt
        });
        const companyId = dbCompanies.insert({
          name: name,
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
          companyName: name,
          price: lastPrice,
          createdAt: createdAt
        });
        dbFoundations.remove({
          _id: foundationData._id
        });
        _.each(directors, ({username, stocks}) => {
          dbLog.insert({
            logType: '創立分股',
            username: [username],
            companyName: foundationData.name,
            amount: stocks,
            createdAt: createdAt
          });
          dbDirectors.insert({companyId, username, stocks, createdAt});
        });
      }
      unlock();
    })
}

