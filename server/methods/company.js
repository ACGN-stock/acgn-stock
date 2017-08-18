'use strict';
import { _ } from 'meteor/underscore';
import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { resourceManager } from '../resourceManager';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbOrders } from '../../db/dbOrders';
import { dbProducts } from '../../db/dbProducts';
import { dbLog } from '../../db/dbLog';
import { dbPrice } from '../../db/dbPrice';

Meteor.methods({
  editCompany(companyName, newCompanyData) {
    check(this.userId, String);
    check(companyName, String);
    check(newCompanyData, {
      tags: [String],
      pictureSmall: new Match.Maybe(String),
      pictureBig: new Match.Maybe(String),
      description: String
    });
    editCompany(Meteor.user(), companyName, newCompanyData);

    return true;
  }
});
function editCompany(user, companyName, newCompanyData) {
  const companyData = dbCompanies.findOne({companyName}, {
    fields: {
      _id: 1,
      companyName: 1,
      manager: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  if (user.username !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  dbLog.insert({
    logType: '經理管理',
    username: [companyData.manager],
    companyName: companyName,
    createdAt: new Date()
  });
  dbCompanies.update({
    _id: companyData._id
  }, {
    $set: newCompanyData
  });
}

Meteor.methods({
  resignManager(companyName) {
    check(this.userId, String);
    check(companyName, String);
    resignManager(Meteor.user(), companyName);

    return true;
  }
});
export function resignManager(user, companyName) {
  const companyData = dbCompanies.findOne({companyName}, {
    fields: {
      manager: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  const username = user.username;
  if (username !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  resourceManager.throwErrorIsResourceIsLock(['elect' + companyName]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('resignManager', ['elect' + companyName], (release) => {
    const companyData = dbCompanies.findOne({companyName}, {
      fields: {
        _id: 1,
        companyName: 1,
        manager: 1,
        candidateList: 1,
        voteList: 1
      }
    });
    if (username !== companyData.manager) {
      throw new Meteor.Error(401, '使用者並非該公司的經理人！');
    }
    const {candidateList, voteList} = companyData;
    const candidateIndex = _.indexOf(candidateList, username);
    if (candidateIndex !== -1) {
      candidateList.splice(candidateIndex, 1);
      voteList.splice(candidateIndex, 1);
    }
    dbLog.insert({
      logType: '辭職紀錄',
      username: [username],
      companyName: companyName,
      createdAt: new Date()
    });
    dbCompanies.update(companyData._id, {
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
  contendManager(companyName) {
    check(this.userId, String);
    check(companyName, String);
    contendManager(Meteor.user(), companyName);

    return true;
  }
});
export function contendManager(user, companyName) {
  const companyData = dbCompanies.findOne({companyName}, {
    fields: {
      _id: 1,
      companyName: 1,
      manager: 1,
      candidateList: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  const username = user.username;
  if (username === companyData.manager) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人了！');
  }
  if (user.profile.revokeQualification) {
    throw new Meteor.Error(401, '使用者的競選經理人資格已經被取消了！');
  }
  const candidateList = companyData.candidateList;
  if (_.contains(candidateList, username)) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人候選者了！');
  }
  resourceManager.throwErrorIsResourceIsLock(['elect' + companyName]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('resignManager', ['elect' + companyName], (release) => {
    const companyData = dbCompanies.findOne({companyName}, {
      fields: {
        _id: 1,
        companyName: 1,
        manager: 1,
        candidateList: 1,
        voteList: 1
      }
    });
    if (username === companyData.manager) {
      throw new Meteor.Error(403, '使用者已經是該公司的經理人了！');
    }
    const candidateList = companyData.candidateList;
    if (_.contains(candidateList, username)) {
      throw new Meteor.Error(403, '使用者已經是該公司的經理人候選者了！');
    }
    const voteList = companyData.voteList;
    candidateList.push(username);
    voteList.push([]);
    dbLog.insert({
      logType: '參選紀錄',
      username: [username],
      companyName: companyName,
      createdAt: new Date()
    });
    dbCompanies.update(companyData._id, {
      $set: {
        candidateList: candidateList,
        voteList: voteList
      }
    });
    release();
  });
}

Meteor.methods({
  supportCandidate(companyName, username) {
    check(this.userId, String);
    check(companyName, String);
    check(username, String);
    supportCandidate(Meteor.user(), companyName, username);

    return true;
  }
});
export function supportCandidate(director, companyName, candidateName) {
  const companyData = dbCompanies.findOne({companyName}, {
    fields: {
      _id: 1,
      companyName: 1,
      manager: 1,
      candidateList: 1,
      voteList: 1
    }
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  const directorName = director.username;
  const directorDataCount = dbDirectors
    .find({
      companyName: companyName,
      username: directorName
    })
    .count();
  if (directorDataCount < 1) {
    throw new Meteor.Error(401, '使用者並非「' + companyName + '」公司的董事，無法支持經理人！');
  }
  const {candidateList, voteList} = companyData;
  const candidateIndex = _.indexOf(candidateList, candidateName);
  if (candidateIndex === -1) {
    throw new Meteor.Error(403, candidateName + '並未競爭「' + companyName + '」公司經理人，無法進行支持！');
  }
  if (_.contains(voteList[candidateIndex], directorName)) {
    throw new Meteor.Error(403, '使用者已經正在支持' + candidateName + '擔任「' + companyName + '」公司經理人了，無法再次進行支持！');
  }
  resourceManager.throwErrorIsResourceIsLock(['elect' + companyName, 'user' + directorName]);
  //先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.request('resignManager', ['elect' + companyName, 'user' + directorName], (release) => {
    const companyData = dbCompanies.findOne({companyName}, {
      fields: {
        _id: 1,
        companyName: 1,
        manager: 1,
        candidateList: 1,
        voteList: 1
      }
    });
    const directorDataCount = dbDirectors
      .find({
        companyName: companyName,
        username: directorName
      })
      .count();
    if (directorDataCount < 1) {
      throw new Meteor.Error(401, '使用者並非「' + companyName + '」公司的董事，無法支持經理人！');
    }
    const {candidateList, voteList} = companyData;
    const candidateIndex = _.indexOf(candidateList, candidateName);
    if (candidateIndex === -1) {
      throw new Meteor.Error(403, candidateName + '並未競爭「' + companyName + '」公司經理人，無法進行支持！');
    }
    if (_.contains(voteList[candidateIndex], director.username)) {
      throw new Meteor.Error(403, '使用者已經正在支持' + candidateName + '擔任「' + companyName + '」公司經理人了，無法再次進行支持！');
    }
    const newVoteList = _.map(voteList, (votes) => {
      return _.without(votes, directorName);
    });
    newVoteList[candidateIndex].push(directorName);

    dbLog.insert({
      logType: '支持紀錄',
      username: [directorName, candidateName],
      companyName: companyName,
      createdAt: new Date()
    });
    dbCompanies.update(companyData._id, {
      $set: {
        voteList: newVoteList
      }
    });
    release();
  });
}

Meteor.methods({
  changeChairmanTitle(companyName, chairmanTitle) {
    check(this.userId, String);
    check(companyName, String);
    check(chairmanTitle, String);
    changeChairmanTitle(Meteor.user(), companyName, chairmanTitle);

    return true;
  }
});
function changeChairmanTitle(user, companyName, chairmanTitle) {
  const username = user.username;
  const chairmanData = dbDirectors.findOne({companyName}, {
    sort: {
      stocks: -1,
      createdAt: 1
    },
    fields: {
      username: 1
    }
  });
  if (chairmanData.username !== username) {
    throw new Meteor.Error(401, '使用者並非該公司的董事長，無法修改董事長頭銜！');
  }
  dbCompanies.update({companyName}, {
    $set: {
      chairmanTitle: chairmanTitle
    }
  });
}

Meteor.methods({
  directorMessage(companyName, message) {
    check(this.userId, String);
    check(companyName, String);
    check(message, String);
    directorMessage(Meteor.user(), companyName, message);

    return true;
  }
});
function directorMessage(user, companyName, message) {
  const username = user.username;
  const directorData = dbDirectors.findOne({companyName, username}, {
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
  queryTodayDealAmount(companyName) {
    check(companyName, String);

    return queryTodayDealAmount(companyName);
  }
});
function queryTodayDealAmount(companyName) {
  const todayBegin = new Date(new Date().setHours(0, 0, 0, 0));
  let amount = 0;
  dbLog
    .find(
      {
        logType: '交易紀錄',
        companyName: companyName,
        createdAt: {
          $gte: todayBegin
        }
      },
      {
        fields: {
          amount: 1
        },
        disableOplog: true
      }
    )
    .forEach((logData) => {
      amount += logData.amount;
    });

  return amount;
}

Meteor.methods({
  queryStocksPrice(companyName) {
    check(companyName, String);

    return queryStocksPrice(companyName);
  }
})
function queryStocksPrice(companyName) {
  const aDayAgo = new Date(Date.now() - 86400000);

  return dbPrice
    .find(
      {
        companyName: companyName,
        createdAt: {
          $gte: aDayAgo
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
      return {
        x: priceData.createdAt.getTime(),
        y: priceData.price
      };
    });
}

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
        manager: reg
      },
      {
        tags: reg
      }
    ];
  }
  if (this.userId && isOnlyShowMine) {
    const user = Meteor.users.findOne(this.userId, {
      fields: {
        username: 1
      }
    });
    const username = user.username;
    const orderCompanyNameList = dbOrders
      .find({username}, {
        fields: {
          companyName: 1
        }
      })
      .map((orderData) => {
        return orderData.companyName;
      });
    const directoryCompanyNameList = dbDirectors
      .find({username}, {
        fields: {
          companyName: 1
        }
      })
      .map((orderData) => {
        return orderData.companyName;
      });
    filter.companyName = {
      $in: _.unique(orderCompanyNameList.concat(directoryCompanyNameList))
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
    tags: 1,
    pictureSmall: 1,
    description: 1,
    totalRelease: 1,
    lastPrice: 1,
    listPrice: 1,
    profit: 1,
    totalValue: 1,
    createdAt: 1
  };

  let initialized = false;
  let total = dbCompanies.find(filter).count();
  this.added('variables', 'totalCountOfStockSummary', {
    value: total
  });

  const observer = dbCompanies
    .find(filter, {sort, skip, limit, fields})
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

Meteor.publish('queryChairmanAsVariable', function(companyName) {
  check(companyName, String);

  const variableId = 'chairmanNameOf' + companyName;
  this.added('variables', variableId, {
    value: '???'
  });
  const observer = dbDirectors
    .find({companyName}, {
      sort: {
        stocks: -1,
        createdAt: 1
      },
      fields: {
        username: 1
      },
      limit: 1
    })
    .observeChanges({
      added: (id, fields) => {
        this.changed('variables', variableId, {
          value: fields.username
        });
      }
    });
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});

Meteor.publish('queryOwnStocks', function() {
  if (this.userId) {
    const user = Meteor.users.findOne(this.userId, {
      fields: {
        username: 1
      }
    });
    const username = user.username;

    return dbDirectors.find({username});
  }

  return [];
});

Meteor.publish('queryMyOrder', function() {
  if (this.userId) {
    const user = Meteor.users.findOne(this.userId, {
      fields: {
        username: 1
      }
    });
    const username = user.username;

    return dbOrders.find({username});
  }

  return [];
});

Meteor.publish('companyDetail', function(companyName) {
  check(companyName, String);

  const observer = dbCompanies
    .find({companyName}, {
      fields: {
        pictureSmall: 0
      }
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
      companyName: 1,
      voteList: 1
    }
  });
  const companyName = companyData.companyName;
  fields.supportStocksList = _.map(companyData.voteList, (voteDirectorList) => {
    return _.reduce(voteDirectorList, (supportStocks, voteDirector) => {
      const directorData = dbDirectors.findOne(
        {
          companyName: companyName,
          username: voteDirector
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

Meteor.publish('companyDirector', function(companyName, offset) {
  check(companyName, String);

  let initialized = false;
  let total = dbDirectors.find({companyName}).count();
  this.added('variables', 'totalCountOfCompanyDirector', {
    value: total
  });

  const observer = dbDirectors
    .find({companyName}, {
      sort: {
        stocks: -1
      },
      skip: offset,
      limit: 10
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

Meteor.publish('companyLog', function(companyName, offset) {
  check(companyName, String);

  let initialized = false;
  let total = dbLog.find({companyName}).count();
  this.added('variables', 'totalCountOfcompanyLog', {
    value: total
  });

  const observer = dbLog
    .find({companyName}, {
      sort: {
        createdAt: -1
      },
      skip: offset,
      limit: 30
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

Meteor.publish('companyOrderExcludeMe', function(companyName, type, offset) {
  check(companyName, String);
  check(type, new Match.OneOf('購入', '賣出'));

  const filter = {
    companyName: companyName,
    orderType: type
  };
  if (this.userId) {
    const user = Meteor.users.findOne(this.userId, {
      fields: {
        username: 1
      }
    });
    filter.username = {
      $ne: user.username
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
      limit: 10
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

Meteor.publish('companyCurrentProduct', function(companyName) {
  check(companyName, String);
  const overdue = 1;

  return dbProducts.find({companyName, overdue});
});

