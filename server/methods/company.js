'use strict';
import url from 'url';
import querystring from 'querystring';
import { _ } from 'meteor/underscore';
import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { resourceManager } from '../resourceManager';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
// import { dbFoundations } from '../../db/dbFoundations';
import { dbOrders } from '../../db/dbOrders';
import { dbProducts } from '../../db/dbProducts';
import { dbLog } from '../../db/dbLog';
import { dbPrice } from '../../db/dbPrice';

Meteor.methods({
  editCompany(companyId, newCompanyData) {
    check(this.userId, String);
    check(companyId, String);
    check(newCompanyData, {
      tags: [String],
      pictureSmall: new Match.Maybe(String),
      pictureBig: new Match.Maybe(String),
      description: String
    });
    editCompany(Meteor.user(), companyId, newCompanyData);

    return true;
  }
});
function editCompany(user, companyId, newCompanyData) {
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      manager: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  const userId = user._id;
  if (userId !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  // const companyName = newCompanyData.companyName;
  // if (dbFoundations.find({companyName}).count() > 0) {
  //   throw new Meteor.Error(403, '已有相同名稱的公司創立中，無法修改公司名稱！');
  // }
  // const sameCompanyNameCompaniesCursor = dbCompanies.find({
  //   _id: {
  //     $ne: companyId
  //   },
  //   companyName: companyName
  // });
  // if (sameCompanyNameCompaniesCursor.count() > 0) {
  //   throw new Meteor.Error(403, '已有相同名稱的公司上市中，無法修改公司名稱！');
  // }
  dbLog.insert({
    logType: '經理管理',
    userId: [userId],
    companyId: companyId,
    createdAt: new Date()
  });
  dbCompanies.update(companyId, {
    $set: newCompanyData
  });
}

Meteor.methods({
  resignManager(companyId) {
    check(this.userId, String);
    check(companyId, String);
    resignManager(Meteor.user(), companyId);

    return true;
  }
});
export function resignManager(user, companyId) {
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      manager: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  const userId = user._id;
  if (userId !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season', 'elect' + companyId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('resignManager', ['elect' + companyId], (release) => {
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        manager: 1,
        candidateList: 1,
        voteList: 1
      }
    });
    if (userId !== companyData.manager) {
      throw new Meteor.Error(401, '使用者並非該公司的經理人！');
    }
    const {candidateList, voteList} = companyData;
    const candidateIndex = _.indexOf(candidateList, userId);
    if (candidateIndex !== -1) {
      candidateList.splice(candidateIndex, 1);
      voteList.splice(candidateIndex, 1);
    }
    dbLog.insert({
      logType: '辭職紀錄',
      userId: [userId],
      companyId: companyId,
      createdAt: new Date()
    });
    dbCompanies.update(companyId, {
      $set: {
        manager: '!none',
        candidateList: candidateList,
        voteList: voteList
      }
    });
    release();
  });
}

Meteor.methods({
  contendManager(companyId) {
    check(this.userId, String);
    check(companyId, String);
    contendManager(Meteor.user(), companyId);

    return true;
  }
});
export function contendManager(user, companyId) {
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      manager: 1,
      candidateList: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  const userId = user._id;
  if (userId === companyData.manager) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人了！');
  }
  const candidateList = companyData.candidateList;
  if (_.contains(candidateList, userId)) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人候選者了！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season', 'elect' + companyId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('resignManager', ['elect' + companyId], (release) => {
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        manager: 1,
        candidateList: 1,
        voteList: 1
      }
    });
    if (userId === companyData.manager) {
      throw new Meteor.Error(403, '使用者已經是該公司的經理人了！');
    }
    const candidateList = companyData.candidateList;
    if (_.contains(candidateList, userId)) {
      throw new Meteor.Error(403, '使用者已經是該公司的經理人候選者了！');
    }
    const voteList = companyData.voteList;
    candidateList.push(userId);
    voteList.push([]);
    dbLog.insert({
      logType: '參選紀錄',
      userId: [userId],
      companyId: companyId,
      createdAt: new Date()
    });
    dbCompanies.update(companyId, {
      $set: {
        candidateList: candidateList,
        voteList: voteList
      }
    });
    release();
  });
}

Meteor.methods({
  supportCandidate(companyId, supportUserId) {
    check(this.userId, String);
    check(companyId, String);
    check(supportUserId, String);
    supportCandidate(Meteor.user(), companyId, supportUserId);

    return true;
  }
});
export function supportCandidate(user, companyId, supportUserId) {
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      companyName: 1,
      manager: 1,
      candidateList: 1,
      voteList: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + companyId + '」的公司！');
  }
  const userId = user._id;
  const directorDataCount = dbDirectors
    .find({
      companyId: companyId,
      userId: userId
    })
    .count();
  if (directorDataCount < 1) {
    throw new Meteor.Error(401, '使用者並非「' + companyData.companyName + '」公司的董事，無法支持經理人！');
  }
  const {companyName, candidateList, voteList} = companyData;
  const candidateIndex = _.indexOf(candidateList, supportUserId);
  if (candidateIndex === -1) {
    throw new Meteor.Error(403, '使用者' + supportUserId + '並未競爭「' + companyName + '」公司經理人，無法進行支持！');
  }
  if (_.contains(voteList[candidateIndex], userId)) {
    throw new Meteor.Error(403, '使用者已經正在支持使用者' + supportUserId + '擔任「' + companyName + '」公司經理人了，無法再次進行支持！');
  }
  resourceManager.throwErrorIsResourceIsLock(['season', 'elect' + companyId, 'user' + userId]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('resignManager', ['elect' + companyId, 'user' + userId], (release) => {
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        companyName: 1,
        manager: 1,
        candidateList: 1,
        voteList: 1
      }
    });
    const directorDataCount = dbDirectors
      .find({
        companyId: companyId,
        userId: userId
      })
      .count();
    if (directorDataCount < 1) {
      throw new Meteor.Error(401, '使用者並非「' + companyData.companyName + '」公司的董事，無法支持經理人！');
    }
    const {companyName, candidateList, voteList} = companyData;
    const candidateIndex = _.indexOf(candidateList, supportUserId);
    if (candidateIndex === -1) {
      throw new Meteor.Error(403, '使用者' + supportUserId + '並未競爭「' + companyName + '」公司經理人，無法進行支持！');
    }
    if (_.contains(voteList[candidateIndex], userId)) {
      throw new Meteor.Error(403, '使用者已經正在支持使用者' + supportUserId + '擔任「' + companyName + '」公司經理人了，無法再次進行支持！');
    }
    const newVoteList = _.map(voteList, (votes) => {
      return _.without(votes, userId);
    });
    newVoteList[candidateIndex].push(userId);

    dbLog.insert({
      logType: '支持紀錄',
      userId: [userId, supportUserId],
      companyId: companyId,
      createdAt: new Date()
    });
    dbCompanies.update(companyId, {
      $set: {
        voteList: newVoteList
      }
    });
    release();
  });
}

Meteor.methods({
  changeChairmanTitle(companyId, chairmanTitle) {
    check(this.userId, String);
    check(companyId, String);
    check(chairmanTitle, String);
    changeChairmanTitle(Meteor.user(), companyId, chairmanTitle);

    return true;
  }
});
function changeChairmanTitle(user, companyId, chairmanTitle) {
  const userId = user._id;
  const chairmanData = dbDirectors.findOne({companyId}, {
    sort: {
      stocks: -1,
      createdAt: 1
    },
    fields: {
      userId: 1
    }
  });
  if (chairmanData.userId !== userId) {
    throw new Meteor.Error(401, '使用者並非該公司的董事長，無法修改董事長頭銜！');
  }
  dbCompanies.update(companyId, {
    $set: {
      chairmanTitle: chairmanTitle
    }
  });
}

Meteor.methods({
  directorMessage(companyId, message) {
    check(this.userId, String);
    check(companyId, String);
    check(message, String);
    directorMessage(Meteor.user(), companyId, message);

    return true;
  }
});
function directorMessage(user, companyId, message) {
  const userId = user._id;
  const directorData = dbDirectors.findOne({companyId, userId}, {
    fields: {
      _id: 1
    }
  });
  if (! directorData) {
    throw new Meteor.Error(401, '使用者並未持有該公司的股票，無法進行董事留言！');
  }
  dbDirectors.update(directorData._id, {
    $set: {
      message: message
    }
  });
}

Meteor.methods({
  queryTodayDealAmount(companyId, lastTime) {
    check(companyId, String);
    check(lastTime, Number);

    return queryTodayDealAmount(companyId, lastTime);
  }
});
function queryTodayDealAmount(companyId, lastTime) {
  lastTime = Math.max(lastTime, new Date().setHours(0, 0, 0, 0) - 1);
  let data = 0;
  dbLog
    .find(
      {
        logType: '交易紀錄',
        companyId: companyId,
        createdAt: {
          $gt: new Date(lastTime)
        }
      },
      {
        fields: {
          amount: 1,
          createdAt: 1
        },
        disableOplog: true
      }
    )
    .forEach((logData) => {
      lastTime = Math.max(lastTime, logData.createdAt.getTime());
      data += logData.amount;
    });

  return {data, lastTime};
}

Meteor.methods({
  queryStocksPrice(companyId, lastTime) {
    check(companyId, String);
    check(lastTime, Number);

    return queryStocksPrice(companyId, lastTime);
  }
})
function queryStocksPrice(companyId, lastTime) {
  lastTime = Math.max(lastTime, new Date().setHours(0, 0, 0, 0) - 1);
  const list = dbPrice
    .find(
      {
        companyId: companyId,
        createdAt: {
          $gt: new Date(lastTime)
        }
      },
      {
        fields: {
          createdAt: 1,
          price: 1
        },
        disableOplog: true
      }
    )
    .map((priceData) => {
      const x = priceData.createdAt.getTime();
      lastTime = Math.max(lastTime, x);

      return {
        x: x,
        y: priceData.price
      };
    });

  return {list, lastTime};
}

//以Ajax方式發布公司名稱
WebApp.connectHandlers.use(function(req, res, next) {
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/companyName') {
    const query = querystring.parse(parsedUrl.query);
    const companyId = query.id;
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        companyName: 1
      }
    });
    if (companyData) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.end(companyData.companyName);
    }
    else {
      res.writeHead(404, {
        'Content-Type': 'text/plain'
      });
      res.write('404 Not Found\n');
      res.end();
    }
  }
  else {
    next();
  }
});

//以Ajax方式發布圖片
WebApp.connectHandlers.use(function(req, res, next) {
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/companyPicture') {
    const query = querystring.parse(parsedUrl.query);
    const companyId = query.id;
    const fieldName = query.type === 'small' ? 'pictureSmall' : 'pictureBig';
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        [fieldName]: 1
      }
    });
    if (companyData) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.end(companyData[fieldName] || '');
    }
    else {
      res.writeHead(404, {
        'Content-Type': 'text/plain'
      });
      res.write('404 Not Found\n');
      res.end();
    }
  }
  else {
    next();
  }
});

Meteor.publish('stockSummary', function(keyword, isOnlyShowMine, sortBy, offset) {
  check(keyword, String);
  check(isOnlyShowMine, Boolean);
  check(sortBy, new Match.OneOf('lastPrice', 'totalValue', 'createdAt'));
  check(offset, Match.Integer);
  const filter = {};
  if (keyword) {
    keyword = keyword.replace(/\\/g, '\\\\');
    const reg = new RegExp(keyword, 'i');
    filter.$or =[
      {
        companyName: reg
      },
      {
        tags: reg
      }
    ];
  }
  const userId = this.userId;
  if (userId && isOnlyShowMine) {
    const seeCompanyIdList = dbDirectors
      .find({userId}, {
        fields: {
          companyId: 1
        }
      })
      .map((directorData) => {
        return directorData.companyId;
      });
    const seeCompanyIdSet = new Set(seeCompanyIdList);
    dbOrders
      .find({userId}, {
        fields: {
          companyId: 1
        }
      })
      .forEach((orderData) => {
        seeCompanyIdSet.add(orderData.companyId);
      });


    filter._id = {
      $in: [...seeCompanyIdSet]
    };
  }
  const sort = {
    [sortBy]: -1
  };
  const skip = offset;
  const limit = 10;
  const fields = {
    _id: 1,
    companyName: 1,
    manager: 1,
    chairmanTitle: 1,
    totalRelease: 1,
    lastPrice: 1,
    listPrice: 1,
    profit: 1,
    totalValue: 1,
    createdAt: 1
  };
  const disableOplog = true;

  let initialized = false;
  let total = dbCompanies.find(filter).count();
  this.added('variables', 'totalCountOfStockSummary', {
    value: total
  });

  const observer = dbCompanies
    .find(filter, {sort, skip, limit, fields, disableOplog})
    .observeChanges({
      added: (id, fields) => {
        this.added('companies', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfStockSummary', {
            value: total
          });
        }
      },
      changed: (id, fields) => {
        this.changed('companies', id, fields);
      },
      removed: (id) => {
        this.removed('companies', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfStockSummary', {
            value: total
          });
        }
      }
    });

  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});

Meteor.publish('queryChairmanAsVariable', function(companyId) {
  check(companyId, String);

  const variableId = 'chairmanIdOf' + companyId;
  this.added('variables', variableId, {
    value: '???'
  });
  const observer = dbDirectors
    .find({companyId}, {
      sort: {
        stocks: -1,
        createdAt: 1
      },
      fields: {
        userId: 1
      },
      limit: 1,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.changed('variables', variableId, {
          value: fields.userId
        });
      }
    });
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});

Meteor.publish('queryOwnStocks', function() {
  const userId = this.userId;
  if (userId) {
    return dbDirectors.find({userId});
  }

  return [];
});

Meteor.publish('queryMyOrder', function() {
  const userId = this.userId;
  if (userId) {
    return dbOrders.find({userId});
  }

  return [];
});

Meteor.publish('companyDetail', function(companyId) {
  check(companyId, String);

  const observer = dbCompanies
    .find(companyId, {
      fields: {
        pictureBig: 0,
        pictureSmall: 0
      },
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        addSupportStocksListField(id, fields);
        this.added('companies', id, fields);
      },
      changed: (id, fields) => {
        addSupportStocksListField(id, fields);
        this.changed('companies', id, fields);
      }
    });
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
function addSupportStocksListField(companyId, fields = {}) {
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      voteList: 1
    }
  });
  fields.supportStocksList = _.map(companyData.voteList, (voteDirectorIdList) => {
    return _.reduce(voteDirectorIdList, (supportStocks, voteDirectorId) => {
      const directorData = dbDirectors.findOne(
        {
          companyId: companyId,
          userId: voteDirectorId
        },
        {
          fields: {
            stocks: 1
          }
        }
      );
      const stocks = directorData ? directorData.stocks : 0;

      return supportStocks + stocks;
    }, 0);
  });
}

Meteor.publish('companyDataForEdit', function(companyId) {
  const overdue = 0;

  return [
    dbCompanies.find(companyId),
    dbProducts.find({companyId, overdue})
  ];
});

Meteor.publish('companyDirector', function(companyId, offset) {
  check(companyId, String);

  let initialized = false;
  let total = dbDirectors.find({companyId}).count();
  this.added('variables', 'totalCountOfCompanyDirector', {
    value: total
  });

  const observer = dbDirectors
    .find({companyId}, {
      sort: {
        stocks: -1
      },
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('directors', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfCompanyDirector', {
            value: total
          });
        }
      },
      changed: (id, fields) => {
        this.changed('directors', id, fields);
      },
      removed: (id) => {
        this.removed('directors', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfCompanyDirector', {
            value: total
          });
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});

Meteor.publish('companyLog', function(companyId, offset) {
  check(companyId, String);

  let initialized = false;
  let total = dbLog.find({companyId}).count();
  this.added('variables', 'totalCountOfcompanyLog', {
    value: total
  });

  const observer = dbLog
    .find({companyId}, {
      sort: {
        createdAt: -1
      },
      skip: offset,
      limit: 30,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('log', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', 'totalCountOfcompanyLog', {
            value: total
          });
        }
      },
      changed: (id, fields) => {
        this.changed('log', id, fields);
      },
      removed: (id) => {
        this.removed('log', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', 'totalCountOfcompanyLog', {
            value: total
          });
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});

Meteor.publish('companyOrderExcludeMe', function(companyId, type, offset) {
  check(companyId, String);
  check(type, new Match.OneOf('購入', '賣出'));

  const filter = {
    companyId: companyId,
    orderType: type
  };
  const userId = this.userId;
  if (userId) {
    filter.userId = {
      $ne: userId
    };
  }

  const variableId = 'totalCountOfCompanyOrder' + type;
  let initialized = false;
  let total = dbOrders.find(filter).count();
  this.added('variables', variableId, {
    value: total
  });

  const observer = dbOrders.find(filter, {
      sort: {
        unitPrice: type === '賣出' ? 1 : -1
      },
      skip: offset,
      limit: 10,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('orders', id, fields);
        if (initialized) {
          total += 1;
          this.changed('variables', variableId, {
            value: total
          });
        }
      },
      changed: (id, fields) => {
        this.changed('orders', id, fields);
      },
      removed: (id) => {
        this.removed('orders', id);
        if (initialized) {
          total -= 1;
          this.changed('variables', variableId, {
            value: total
          });
        }
      }
    });
  initialized = true;
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});

Meteor.publish('companyCurrentProduct', function(companyId) {
  check(companyId, String);
  const overdue = 1;
  const disableOplog = true;

  return dbProducts.find({companyId, overdue}, {disableOplog});
});

