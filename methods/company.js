'use strict';
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { lockManager } from './lockManager';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbOrders } from '../db/dbOrders';
import { dbProducts } from '../db/dbProducts';
import { dbLog } from '../db/dbLog';

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
  const companyData = dbCompanies.findOne({companyName});
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  const unlock = lockManager.lock([user._id, companyName]);
  dbLog.insert({
    logType: '公司撤銷',
    username: [companyData.manager],
    companyName: companyName,
    message: message,
    createdAt: new Date()
  });
  dbCompanies.remove({
    _id: companyData._id
  });
  dbDirectors.remove({
    companyName: companyName
  });
  dbOrders.remove({
    companyName: companyName
  });
  dbProducts.remove({
    companyName: companyName
  });
  unlock();
}

Meteor.methods({
  revokeManagerQualification(username, message) {
    check(this.userId, String);
    check(message, String);
    revokeManagerQualification(Meteor.user(), username, message);
  }
});

function revokeManagerQualification(admin, username, message) {
  if (! admin.profile.isAdmin) {
    throw new Meteor.Error(401, '使用者並非管理員！');
  }
  const user = Meteor.users.findOne({username});
  if (! user) {
    throw new Meteor.Error(404, '找不到使用者「' + username + '」！');
  }
  const unlock = lockManager.lock([admin._id]);
  dbLog.insert({
    logType: '取消資格',
    username: [admin.username, username],
    message: message,
    createdAt: new Date()
  });
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
    const companyName = companyData.companyName;
    const unlock = lockManager.lock([companyName]);
    if (companyData.manager === username) {
      companyData.manager = '';
    }
    const {candidateList, voteList} = companyData;
    const candidateIndex = _.indexOf(candidateList, username);
    if (candidateIndex !== -1) {
      candidateList.splice(candidateIndex, 1);
      voteList.splice(candidateIndex, 1);
    }
    dbCompanies.update({
      _id: companyData._id
    }, {
      $set: {
        manager: companyData.manager,
        candidateList: candidateList,
        voteList: voteList
      }
    });
    unlock();
  });
  unlock();
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
  const companyData = dbCompanies.findOne({companyName});
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  if (user.username !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  const unlock = lockManager.lock([user._id, companyName]);
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
  unlock();
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
  const companyData = dbCompanies.findOne({companyName});
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  if (user.username !== companyData.manager) {
    throw new Meteor.Error(401, '使用者並非該公司的經理人！');
  }
  const unlock = lockManager.lock([user._id, companyName]);
  dbLog.insert({
    logType: '辭職紀錄',
    username: [user.username],
    companyName: companyName,
    createdAt: new Date()
  });
  const {candidateList, voteList} = companyData.candidateList;
  const candidateIndex = _.indexOf(candidateList, user.username);
  if (candidateIndex !== -1) {
    candidateList.splice(candidateIndex, 1);
    voteList.splice(candidateIndex, 1);
  }
  dbCompanies.update({
    _id: companyData._id
  }, {
    $set: {
      manager: '!none',
      candidateList: candidateList,
      voteList: voteList
    }
  });
  unlock();
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
  const companyData = dbCompanies.findOne({companyName});
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  if (user.username === companyData.manager) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人了！');
  }
  const {candidateList, voteList} = companyData;
  if (_.contains(candidateList, user.username)) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人候選者了！');
  }
  if (user.profile.revokeQualification) {
    throw new Meteor.Error(401, '使用者的競選經理人資格已經被取消了！');
  }
  const unlock = lockManager.lock([user._id, companyName]);
  candidateList.push(user.username);
  voteList.push([]);
  dbLog.insert({
    logType: '參選紀錄',
    username: [user.username],
    companyName: companyName,
    createdAt: new Date()
  });
  dbCompanies.update({
    _id: companyData._id
  }, {
    $set: {
      candidateList: candidateList,
      voteList: voteList
    }
  });
  unlock();
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

export function supportCandidate(director, companyName, username) {
  const companyData = dbCompanies.findOne({companyName});
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  const {candidateList, voteList} = companyData;
  const candidateIndex = _.indexOf(candidateList, username);
  if (candidateIndex === -1) {
    throw new Meteor.Error(403, username + '並未競爭「' + companyName + '」公司經理人，無法進行支持！');
  }
  if (_.contains(voteList[candidateIndex], director.username)) {
    throw new Meteor.Error(403, '使用者已經正在支持' + username + '擔任「' + companyName + '」公司經理人了，無法再次進行支持！');
  }
  const directorName = director.username;
  const directorData = dbDirectors.findOne({
    companyName: companyName,
    username: directorName
  });
  if (! directorData) {
    throw new Meteor.Error(401, '使用者並非「' + companyName + '」公司的董事，無法支持經理人！');
  }
  const newVoteList = _.map(voteList, (votes) => {
    return _.without(votes, directorName);
  });
  newVoteList[candidateIndex].push(directorName);

  const unlock = lockManager.lock([director._id, companyName]);
  dbLog.insert({
    logType: '支持紀錄',
    username: [director.username, username],
    companyName: companyName,
    createdAt: new Date()
  });
  dbCompanies.update({
    _id: companyData._id
  }, {
    $set: {
      voteList: newVoteList
    }
  });
  unlock();
}
