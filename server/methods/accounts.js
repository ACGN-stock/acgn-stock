'use strict';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check, Match } from 'meteor/check';
import { resourceManager } from '../resourceManager';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbLog, accuseLogTypeList } from '../../db/dbLog';
import { dbTaxes } from '../../db/dbTaxes';
import { dbVariables } from '../../db/dbVariables';
import { limitSubscription } from './rateLimit';
import { debug } from '../debug';
import { publishTotalCount } from './utils';

Meteor.methods({
  payTax(taxId, amount) {
    check(this.userId, String);
    check(taxId, Mongo.ObjectID);
    check(amount, Match.Integer);
    payTax(Meteor.user(), taxId, amount);

    return true;
  }
});
function payTax(user, taxId, amount) {
  debug.log('payTax', {user, taxId, amount});
  if (amount < 1) {
    throw new Meteor.Error(403, '繳納稅金數量錯誤！');
  }
  if (user.profile.money < amount) {
    throw new Meteor.Error(403, '剩餘金錢不足，無法繳納稅金！');
  }
  const taxData = dbTaxes.findOne(taxId);
  if (! taxData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + taxId + '」的稅金資料！');
  }
  const totalNeedPay = taxData.tax + taxData.zombie + taxData.fine - taxData.paid;
  if (amount > totalNeedPay) {
    throw new Meteor.Error(403, '繳納金額與應納金額不相符！');
  }
  const userId = user._id;
  resourceManager.throwErrorIsResourceIsLock(['user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('payTax', ['user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        profile: 1
      }
    });
    if (user.profile.money < amount) {
      throw new Meteor.Error(403, '剩餘金錢不足，無法繳納稅金！');
    }
    const taxData = dbTaxes.findOne(taxId);
    if (! taxData) {
      throw new Meteor.Error(404, '找不到識別碼為「' + taxId + '」的稅金資料！');
    }
    const totalNeedPay = taxData.tax + taxData.zombie + taxData.fine - taxData.paid;
    if (amount > totalNeedPay) {
      throw new Meteor.Error(403, '繳納金額與應納金額不相符！');
    }
    const createdAt = new Date();
    //若在上次發薪後的繳稅紀錄，則併為同一筆紀錄
    const existsLogData = dbLog.findOne({
      userId: userId,
      createdAt: {
        $gt: new Date(dbVariables.get('lastPayTime').getTime())
      },
      logType: '繳納稅金'
    });
    if (existsLogData) {
      dbLog.update(existsLogData._id, {
        $set: {
          createdAt: createdAt
        },
        $inc: {
          amount: amount
        }
      });
    }
    else {
      dbLog.insert({
        logType: '繳納稅金',
        userId: [userId],
        amount: amount,
        createdAt: createdAt
      });
    }
    if (amount === totalNeedPay) {
      dbTaxes.remove(taxId);
    }
    else {
      dbTaxes.update(taxId, {
        $inc: {
          paid: amount
        }
      });
    }
    const expiredTaxesCount = dbTaxes
      .find({
        userId: userId,
        expireDate: {
          $lte: new Date()
        }
      })
      .count();
    //如果還有逾期未繳的稅單，扣錢就好
    if (expiredTaxesCount > 0) {
      Meteor.users.update(userId, {
        $inc: {
          'profile.money': amount * -1
        }
      });
    }
    //所有逾期未繳的稅單都繳納完畢後，取消繳稅逾期狀態
    else {
      Meteor.users.update(userId, {
        $inc: {
          'profile.money': amount * -1
        },
        $set: {
          'profile.notPayTax': false
        }
      });
    }
    release();
  });
}

Meteor.publish('accountInfo', function(userId) {
  debug.log('publish accountInfo', userId);
  check(userId, String);

  return [
    Meteor.users.find(userId, {
      fields: {
        'services.google.email': 1,
        'status.lastLogin.date': 1,
        'status.lastLogin.ipAddr': 1,
        username: 1,
        profile: 1,
        createdAt: 1
      }
    }),
    dbCompanies
      .find(
        {
          manager: userId,
          isSeal: false
        },
        {
          fields: {
            companyName: 1,
            manager: 1
          },
          disableOplog: true
        }
      )
  ];
});
//一分鐘最多20次
limitSubscription('accountInfo');

Meteor.publish('accountInfoTax', function(userId, offset) {
  debug.log('publish accountInfoTax', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const filter = { userId };

  const totalCountObserver = publishTotalCount('totalCountOfAccountInfoTax', dbTaxes.find(filter), this);

  const pageObserver = dbTaxes
    .find(filter, {
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('taxes', id, fields);
      },
      changed: (id, fields) => {
        this.changed('taxes', id, fields);
      },
      removed: (id) => {
        this.removed('taxes', id);
      }
    });

  this.ready();
  this.onStop(() => {
    totalCountObserver.stop();
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountInfoTax');

Meteor.publish('accountOwnStocks', function(userId, offset) {
  debug.log('publish accountOwnStocks', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const filter = { userId };

  const totalCountObserver = publishTotalCount('totalCountOfAccountOwnStocks', dbDirectors.find(filter), this);

  const pageObserver = dbDirectors
    .find(filter, {
      fields: {
        userId: 1,
        companyId: 1,
        stocks: 1
      },
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('directors', id, fields);
      },
      changed: (id, fields) => {
        this.changed('directors', id, fields);
      },
      removed: (id) => {
        this.removed('directors', id);
      }
    });

  this.ready();
  this.onStop(() => {
    totalCountObserver.stop();
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountOwnStocks');

Meteor.publish('accountAccuseLog', function(userId, offset) {
  debug.log('publish accountAccuseLog', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const filter = {
    userId,
    logType: { $in: accuseLogTypeList }
  };

  const totalCountObserver = publishTotalCount('totalCountOfAccountAccuseLog', dbLog.find(filter), this);

  const pageObserver = dbLog
    .find(filter, {
      sort: { createdAt: -1 },
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('log', id, fields);
      },
      removed: (id) => {
        this.removed('log', id);
      }
    });

  if (this.userId === userId) {
    Meteor.users.update({
      _id: userId
    }, {
      $set: { 'status.lastReadFscAnnouncementDate': new Date() }
    });
  }

  this.ready();
  this.onStop(() => {
    totalCountObserver.stop();
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountInfoLog');

Meteor.publish('accountInfoLog', function(userId, offset) {
  debug.log('publish accountInfoLog', {userId, offset});
  check(userId, String);
  check(offset, Match.Integer);

  const firstLogData = dbLog.findOne({ userId }, { sort: { createdAt: 1 } });
  const firstLogDate = firstLogData ? firstLogData.createdAt : new Date();

  const filter = {
    userId: { $in: [userId, '!all'] },
    createdAt: { $gte: firstLogDate }
  };

  const totalCountObserver = publishTotalCount('totalCountOfAccountInfoLog', dbLog.find(filter), this);

  const pageObserver = dbLog
    .find(filter, {
      sort: { createdAt: -1 },
      skip: offset,
      limit: 30,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('log', id, fields);
      },
      removed: (id) => {
        this.removed('log', id);
      }
    });

  this.ready();
  this.onStop(() => {
    totalCountObserver.stop();
    pageObserver.stop();
  });
});
//一分鐘最多20次
limitSubscription('accountInfoLog');

Meteor.publish('lastFscAnnouncementDate', function() {
  debug.log('publish lastFscAnnouncementDate');

  const userId = Meteor.userId();
  check(userId, String);

  this.added('variables', 'lastFscAnnouncementDate', { value: null });
  const observer = dbLog.find({
    logType: '金管通告',
    userId
  }, {
    sort: { createdAt: -1 },
    limit: 1
  }).observeChanges({
    added: (id, fields) => {
      this.changed('variables', 'lastFscAnnouncementDate', { value: fields.createdAt });
    }
  });
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
