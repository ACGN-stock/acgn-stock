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
  dbLog.insert({
    logType: '取消資格',
    username: [admin.username, username],
    message: message
  });
  dbCompanies.update({
    manager: username
  }, {
    $set: {
      manager: ''
    }
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
  dbCompanies.update({
    _id: companyData._id
  }, {
    $set: {
      manager: ''
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
  if (_.includes(companyData.electList, user.username)) {
    throw new Meteor.Error(403, '使用者已經是該公司的經理人候選者了！');
  }
  if (user.profile.revokeQualification) {
    throw new Meteor.Error(401, '使用者的競選經理人資格已經被取消了！');
  }
  dbLog.insert({
    logType: '參選紀錄',
    username: [user.username],
    companyName: companyName
  });
  dbCompanies.update({
    _id: companyData._id
  }, {
    $push: {
      electList: user.username
    }
  });
}

export function electManager() {

}
export default electManager;
