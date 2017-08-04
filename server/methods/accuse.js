'use strict';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { dbCompanies } from '../../db/dbCompanies';
import { dbProducts } from '../../db/dbProducts';
import { dbLog } from '../../db/dbLog';

Meteor.methods({
  accuseCompany(companyName, message) {
    check(this.userId, String);
    check(companyName, String);
    check(message, String);
    accuseCompany(Meteor.user(), companyName, message);

    return true;
  }
});

function accuseCompany(user, companyName, message) {
  const companyData = dbCompanies.findOne({companyName});
  if (! companyData) {
    throw new Meteor.Error(404, '找不到名稱為「' + companyName + '」的公司！');
  }
  dbLog.insert({
    logType: '舉報公司',
    username: [user.username],
    companyName: companyName,
    message: message,
    createdAt: new Date()
  });
}

Meteor.methods({
  accuseProduct(productId, message) {
    check(this.userId, String);
    check(productId, String);
    check(message, String);
    accuseProduct(Meteor.user(), productId, message);

    return true;
  }
});

function accuseProduct(user, productId, message) {
  const productData = dbProducts.findOne({
    _id: productId
  });
  if (! productData) {
    throw new Meteor.Error(404, '找不到識別碼為「' + productId + '」的產品！');
  }
  dbLog.insert({
    logType: '舉報產品',
    username: [user.username],
    companyName: productData.companyName,
    productId: productId,
    message: message,
    createdAt: new Date()
  });
}
