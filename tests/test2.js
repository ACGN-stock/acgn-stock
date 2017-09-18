'use strict';
import { Meteor } from 'meteor/meteor';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbOrders } from '../db/dbOrders';
import { createBuyOrder, createSellOrder, retrieveOrder } from '../server/methods/order';

const user1Id = Meteor.users.findOne({}, {
  fields: {
    _id: 1
  }
})._id;
const user2Id = Meteor.users.findOne({}, {
  skip: 1,
  fields: {
    _id: 1
  }
})._id;
Meteor.users.update(user1Id, {
  $inc: {
    'profile.money': 100000
  }
});
const companyData = dbCompanies.findOne({}, {
  fields: {
    _id: 1,
    listPrice: 1
  }
});
const companyId = companyData._id;
const listPrice = companyData.listPrice;

dbOrders
  .find({
    companyId: companyId,
    userId: user1Id
  })
  .forEach((orderData) => {
    retrieveOrder(Meteor.users.findOne(user1Id), orderData._id);
  });
dbOrders
  .find({
    companyId: companyId,
    userId: user2Id
  })
  .forEach((orderData) => {
    retrieveOrder(Meteor.users.findOne(user2Id), orderData._id);
  });

dbCompanies.update(companyId, {
  $inc: {
    totalRelease: 100
  }
});
const existDirectorData = dbDirectors.findOne({
  companyId: companyId,
  userId: user2Id
});
if (existDirectorData) {
  dbDirectors.update(existDirectorData._id, {
    $inc: {
      stocks: 100
    }
  });
}
else {
  dbDirectors.insert({
    companyId: companyId,
    userId: user2Id,
    stocks: 100,
    createdAt: new Date(),
    message: ''
  });
}
const startTestTime = Date.now();
console.log('start test at: ' + startTestTime);
for (let i = 0; i <= 1000; i += 1) {
  let user1 = Meteor.users.findOne(user1Id);
  createBuyOrder(user1, {
    companyId: companyId,
    unitPrice: listPrice,
    amount: 100
  });
  let user2 = Meteor.users.findOne(user2Id);
  createSellOrder(user2, {
    companyId: companyId,
    unitPrice: listPrice,
    amount: 50
  });
  createSellOrder(user2, {
    companyId: companyId,
    unitPrice: listPrice,
    amount: 50
  });
  user2 = Meteor.users.findOne(user2Id);
  createBuyOrder(user2, {
    companyId: companyId,
    unitPrice: listPrice,
    amount: 100
  });
  user1 = Meteor.users.findOne(user1Id);
  createSellOrder(user1, {
    companyId: companyId,
    unitPrice: listPrice,
    amount: 100
  });
}
console.log('test ended, cost time: ' + (Date.now() - startTestTime));
