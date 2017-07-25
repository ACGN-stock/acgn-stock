'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { tx } from 'meteor/babrahams:transactions';
import { dbFoundations } from '../db/dbFoundations';
import { dbLog } from '../db/dbLog';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { config } from '../config';

Meteor.methods({
  foundCompany(foundCompanyData) {
    check(this.userId, String);
    foundCompany(Meteor.user(), foundCompanyData);

    return true;
  }
});

export function foundCompany(user, foundCompanyData) {
  const name = foundCompanyData.name;
  if (dbFoundations.findOne({name}) || dbCompanies.findOne({name})) {
    throw new Meteor.Error(403, '已有相同名稱的公司上市或創立中，無法創立同名公司！');
  }
  foundCompanyData.manager = user;
  foundCompanyData.createdAt = new Date();
  tx.start('創立公司');
  dbLog.insert({
    logType: '創立公司',
    username: [name.manager],
    companyName: name
  }, {
    tx: true
  });
  dbFoundations.insert(foundCompanyData, {tx: true});
  tx.commit();
}

Meteor.methods({
  investFoundCompany(foundCompanyId, amount) {
    check(this.userId, String);
    check(foundCompanyId, String);
    check(amount, Number);
    investFoundCompany(Meteor.user(), foundCompanyId, amount);

    return true;
  }
});

export function investFoundCompany(user, foundCompanyId, amount) {
  const minimumInvest = Math.ceil(config.beginReleaseStock / foundationNeedUsers);
  if (amount < minimumInvest) {
    throw new Meteor.Error(403, '最低投資金額為' + amount + '！');
  }
  const foundCompanyData = dbFoundations.findOne(foundCompanyId);
  if (foundCompanyData) {
    if (user.profile.money < amount) {
      throw new Meteor.Error(403, '金錢不足，無法投資！');
    }
    const username = user.username;
    const invest = foundCompanyData.invest;
    const existsInvest = _.findWhere(invest, {username});
    if (existsInvest) {
      existsInvest.amount += amount;
    }
    else {
      invest.push({username, amount});
    }
    tx.start('參予投資');
    dbLog.insert({
      logType: '參予投資',
      username: [username],
      companyName: foundCompanyData.name,
      amount: amount
    }, {
      tx: true
    });
    Meteor.users.update({
      _id: user._id
    }, {
      $inc: {
        'profile.money': amount * -1
      }
    }, {
      tx: true
    });
    dbFoundations.update({
      _id: foundCompanyId
    }, {
      $set: {invest}
    }, {
      tx: true
    });
    tx.commit();
  }
  else {
    throw new Meteor.Error(404, '創立計劃並不存在，可能已經上市或被撤銷！');
  }
}

const {foundExpireTime, foundationNeedUsers, beginReleaseStock} = config;
export function checkFoundCompany() {
  const foundExpireDate = new Date(Date.now() - foundExpireTime);
  dbFoundations
    .find({
      createdAt: {
        $gte: foundExpireDate
      }
    }, {
      disableOplog: true
    })
    .forEach((foundation) => {
      const invest = foundation.invest;
      if (invest.length < foundationNeedUsers) {
        tx.start('創立失敗');
        dbLog.insert({
          logType: '創立失敗',
          username: _.pluck(invest, 'username'),
          companyName: foundation.name
        }, {
          tx: true
        });
        dbFoundations.remove({
          _id: foundation._id
        }, {
          tx: true
        });
        _.each(invest, ({username, amount}) => {
          Meteor.users.update({username}, {
            $inc: {
              'profile.money': amount
            }
          }, {
            tx: true
          });
        });
        tx.commit();
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

        tx.start('創立成功');
        dbLog.insert({
          logType: '創立成功',
          username: _.pluck(sortedInvest, 'username'),
          companyName: foundation.name
        }, {
          tx: true
        });
        const companyId = dbCompanies.insert({
          name: foundation.name,
          manager: foundation.manager,
          tags: foundation.tags,
          puctureSmall: foundation.puctureSmall,
          puctureBig: foundation.puctureBig,
          description: foundation.description,
          totalRelease: totalRelease,
          lastPrice: lastPrice,
          totalValue: totalRelease * lastPrice,
          candidateList: [foundation.manager],
          createdAt: createdAt
        }, {
          tx: true,
          instant: true
        });
        if (companyId) {
          dbFoundations.remove({
            _id: foundation._id
          }, {
            tx: true
          });
          _.each(directors, ({username, stocks}) => {
            dbLog.insert({
              logType: '創立分股',
              username: [username],
              companyName: foundation.name,
              amount: stocks,
            }, {
              tx: true
            });
            dbDirectors.insert({companyId, username, stocks, createdAt}, {
              tx: true
            });
          });
          tx.commit();
        }
      }
    })
}

