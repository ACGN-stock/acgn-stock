'use strict';
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { tx } from 'meteor/babrahams:transactions';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbOrders } from '../db/dbOrders';
import { dbProducts } from '../db/dbProducts';
import { dbLog } from '../db/dbLog';
import { dbSeasonRecord } from '../db/dbSeasonRecord';

Meteor.methods({
  revokeCompany(companyName, message) {
    check(this.userId, String);
    check(companyName, String);
    check(message, String);
    revokeCompany(Meteor.user(), companyName, message);

    return true;
  }
});

function revokeCompany(user, companyName, message) {
  if (! user.profile.isAdmin) {
    throw new Meteor.Error(401, '權限不足！');
  }
  const companyData = dbCompanies.findOne({
    name: companyName
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  tx.start('公司撤銷');
  dbLog.insert({
    logType: '公司撤銷',
    username: [companyData.manager],
    companyName: companyName,
    message: message
  }, {
    tx: true
  });
  dbCompanies.remove({
    _id: companyData._id
  }, {
    tx: true
  });
  dbDirectors.remove({
    companyName: companyName
  }, {
    tx: true
  });
  dbOrders.remove({
    companyName: companyName
  }, {
    tx: true
  });
  dbProducts.remove({
    companyName: companyName
  }, {
    tx: true
  });
  tx.commit();
}

Meteor.methods({
  revokeManagerQualification(username, message) {
    check(this.userId, String);
    check(message, String);
    revokeManagerQualification(Meteor.user(), username, message);
  }
})

function revokeManagerQualification(admin, username, message) {
  if (! admin.profile.isAdmin) {
    throw new Meteor.Error(401, '使用者並非管理員！');
  }
  const user = Meteor.users.findOne({username});
  if (! user) {
    throw new Meteor.Error(404, '找不到使用者「' + username + '」！');
  }
  dbCompanies.find({
    $or: [
      {
        manager: username
      },
      {
        candidateList: username
      }
    ]
  }, {
    disableOplog: true
  }).forEach((companyData) => {
    if (companyData.manager === username) {
      companyData.manager = '';
    }
    const {candidateList, voteList} = companyData;
    const candidateIndex = _.findIndex(candidateList, (candidate) => {
      return (candidate === username);
    });
    if (candidateIndex !== -1) {
      candidateList.splice(candidateIndex, 1);
      voteList.splice(candidateIndex, 1);
    }
    dbLog.insert({
      logType: '取消資格',
      username: [admin.username, username],
      companyName: companyData.name,
      message: message
    });
    dbCompanies.update({
      _id: companyData._id
    }, {
      $set: {
        manager: companyData.manager,
        candidateList: candidateList,
        voteList: voteList
      }
    });
  });
}

Meteor.methods({
  editCompany(companyName, newCompanyData) {
    check(this.userId, String);
    check(companyName, String);
    check(newCompanyData, {
      tags: [String],
      puctureSmall: String,
      puctureBig: String,
      description: String
    });
    editCompany(Meteor.user(), companyName, newCompanyData);


    return true;
  }
});

function editCompany(user, companyName, newCompanyData) {
  const companyData = dbCompanies.findOne({
    name: companyName
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
    companyName: companyName
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

function resignManager(user, companyName) {
  const companyData = dbCompanies.findOne({
    name: companyName
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  if (user.username !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  dbLog.insert({
    logType: '辭職紀錄',
    username: [user.username],
    companyName: companyName
  });
  const {candidateList, voteList} = companyData.candidateList;
  const candidateIndex = _.findIndex(candidateList, user.username);
  if (candidateIndex !== -1) {
    candidateList.splice(candidateIndex, 1);
    voteList.splice(candidateIndex, 1);
  }
  dbCompanies.update({
    _id: companyData._id
  }, {
    $set: {
      manager: '',
      candidateList: candidateList,
      voteList: voteList
    }
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

function contendManager(user, companyName) {
  const companyData = dbCompanies.findOne({
    name: companyName
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  if (user.username === companyData.manager) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人了！');
  }
  const {candidateList, voteList} = companyData;
  if (_.includes(candidateList, user.username)) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人候選者了！');
  }
  if (user.profile.revokeQualification) {
    throw new Meteor.Error(401, '使用者的競選經理人資格已經被取消了！');
  }
  candidateList.push(user.username);
  voteList.push([]);
  dbLog.insert({
    logType: '參選紀錄',
    username: [user.username],
    companyName: companyName
  });
  dbCompanies.update({
    _id: companyData._id
  }, {
    $set: {
      candidateList: candidateList,
      voteList: voteList
    }
  });
}

Meteor.methods({
  supportManager(companyName, username) {
    check(this.userId, String);
    check(companyName, String);
    check(username, String);
    supportManager(Meteor.user(), companyName, username);

    return true;
  }
});

function supportManager(director, companyName, username) {
  const companyData = dbCompanies.findOne({
    name: companyName
  });
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  const {candidateList, voteList} = companyData;
  const candidateIndex = _.findIndex(candidateList, username);
  if (candidateIndex === -1) {
    throw new Meteor.Error(403, username + '並未競爭「' + companyName + '」公司經理人，無法進行支持！');
  }
  if (_.includes(voteList[candidateIndex], director.username)) {
    throw new Meteor.Error(403, '使用者已經正在支持' + username + '擔任「' + companyName + '」公司經理人了，無法再次進行支持！');
  }
  const directorData = dbDirectors.findOne({
    companyName: companyName,
    username: director.username
  })
  if (! directorData) {
    throw new Meteor.Error(401, '使用者並非「' + companyName + '」公司的董事，無法支持經理人！');
  }
  voteList[candidateIndex].push(director.username);

  dbLog.insert({
    logType: '支持紀錄',
    username: [director.username, username],
    companyName: companyName
  });
  dbCompanies.update({
    _id: companyData._id
  }, {
    $set: {
      voteList: voteList
    }
  });
}

export function electManager() {
  dbCompanies.find({
    $or: [
      {
        candidateList: {
          $not: {
            $size: 1
          }
        }
      },
      {
        manager: ''
      }
    ]
  }, {
    disableOplog: true
  }).forEach((companyData) => {
    //沒有經理人也沒有競選人的情況，不予處理
    if (companyData.candidateList.length === 0) {
      return true;
    }
    const seasonRecord = dbSeasonRecord.findOne();
    const message = (
      convertDateToText(seasonRecord.startDate) +
      '～' +
      convertDateToText(seasonRecord.endDate)
    );
    const companyName = companyData.name;
    //沒有經理人且只有一位競選人的情況下，直接當選
    if (companyData.candidateList.length === 1) {
      dbLog.insert({
        logType: '就任經理',
        username: companyData.candidateList,
        companyName: companyName,
        message: message
      });
      dbCompanies.update({
        _id: companyData._id
      }, {
        $set: {
          manager: companyData.candidateList[0],
          candidateList: [winner.username],
          voteList: [ [] ]
        }
      });

      return true;
    }

    const voteList = companyData.voteList;
    const candidateList = _.map(companyData.candidateList, (candidate, index) => {
      const voteDirectorList =  voteList[index];
      let stocks = _.reduce(voteDirectorList, (stocks, username) => {
        const directorData = dbDirectors.findOne({companyName, username});

        return stocks + (directorData ? directorData.stocks : 0);
      }, 0);

      return {
        username: candidate,
        stocks: stocks
      };
    });
    const sortedCandidateList = _.sortBy(candidateList, 'stocks');
    const winner = _.last(sortedCandidateList);
    dbLog.insert({
      logType: '就任經理',
      username: [winner.username],
      companyName: companyName,
      message: message,
      amount: winner.stocks
    });
    dbCompanies.update({
      _id: companyData._id
    }, {
      $set: {
        manager: winner.username,
        candidateList: [winner.username],
        voteList: [ [] ]
      }
    });
  });
}
export default electManager;

function convertDateToText(date) {
  return (
    date.getFullYear() + '/' +
    padZero(date.getMonth() + 1) + '/' +
    padZero(date.getDate()) + ' ' +
    padZero(date.getHours()) + ':' +
    padZero(date.getMinutes())
  );
}
function padZero(n) {
  if (n < 10) {
    return '0' + n;
  }
  else {
    return n;
  }
}
