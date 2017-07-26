'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { dbFoundations } from '../db/dbFoundations';
import { dbCompanies } from '../db/dbCompanies';
import { dbOrders } from '../db/dbOrders';
import { dbDirectors } from '../db/dbDirectors';
import { dbProducts } from '../db/dbProducts';
import { foundCompany, investFoundCompany } from '../methods/foundation';
import { createBuyOrder, createSellOrder, retrieveOrder } from '../methods/order';
import { createProduct, voteProduct } from '../methods/product';
import { resignManager, contendManager, supportCandidate } from '../methods/company';

if (Meteor.users.find().count() < 1) {
  for (let i = 1; i <= 30; i += 1) {
    Accounts.createUser({
      username: 'user' + i,
      password: 'user' + i
    });
  }
}

Meteor.users.find().forEach((user) => {
  doSomethingAfterRandomTime(user);
});

function doSomethingAfterRandomTime(user) {
  const randomTime = randomNumber(30000, 10000);
  console.log(user.username + ' will do something after ' + randomTime + 'ms.');
  Meteor.setTimeout(() => {
    try {
      doSomething(user);
    }
    catch(e) {
      console.log(e);
    }
    doSomethingAfterRandomTime(user);
  }, randomTime);
}

function doSomething(user) {
  const username = user.username;
  console.log(username + ' is doing something...');
  const foundationNumber = dbFoundations.find().count();
  if (foundationNumber < 1 || (foundationNumber < 3 && probability(25))) {
    console.log(username + ' want to found a company!');
    foundCompany(user, {
      name: _.uniqueId('company'),
      tags: ['forTest'],
      description: 'for test test test test'
    });
  }
  else if (foundationNumber > 0 && user.profile.money > 200) {
    console.log(username + ' want to invest a found company!');
    const foundationData = _.sample(dbFoundations.find().fetch());
    investFoundCompany(user, foundationData._id, randomNumber(user.profile.money - 200, 100));
  }
  if (user.profile.money > 200 && probability(50) && dbCompanies.find().count() > 0) {
    const companyData = _.sample(dbCompanies.find().fetch());
    const useMoney = randomNumber(user.profile.money);
    const unitPrice = randomNumber(companyData.lastPrice + 100);
    const amount = Math.floor(useMoney / unitPrice);
    if (amount > 0) {
      console.log(username + ' want to buy some stocks!');

      createBuyOrder(user, {
        companyName: companyData.name,
        orderType: '購入',
        unitPrice: unitPrice,
        amount: amount
      });
    }
  }
  const directorNumber = dbDirectors.find({username}).count();
  if (probability(directorNumber * 5)) {
    const directorData = _.sample(dbDirectors.find({username}).fetch());
    const name = directorData.companyName;
    const companyData = dbCompanies.findOne({name});
    if (probability(25)) {
      console.log(username + ' want to sell some stocks!');

      createSellOrder(user, {
        companyName: name,
        orderType: '賣出',
        unitPrice: randomNumber(companyData.lastPrice, randomNumber(companyData.lastPrice)),
        amount: probability(10) ? directorData.stocks : randomNumber(directorData.stocks)
      });
    }
    else {
      console.log(username + ' support a candidate!');
      const candidate = _.sample(companyData.candidateList);
      supportCandidate(user, name, candidate);
    }
  }
  if (probability(dbOrders.find().count() * 5)) {
    console.log(username + ' want to cancel a order!');
    const orderData = _.sample(dbOrders.find().fetch());
    retrieveOrder(user, orderData._id);
  }
  const beManagerCompanies = dbCompanies.find({manager: username}).fetch();
  if (beManagerCompanies.length) {
    if (probability(5)) {
      console.log(username + ' want to resign a manager!');
      const companyData = _.sample(beManagerCompanies);
      resignManager(user, companyData.name);
    }
    else if (probability(30)) {
      console.log(username + ' want to create a product!');
      const companyData = _.sample(beManagerCompanies);
      const randomSuffix = Date.now();
      createProduct(user, {
        name: 'product' + randomSuffix,
        companyName: companyData.name,
        type: '繪圖',
        url: generateUrl(randomSuffix)
      });
    }
  }
  else {
    const matchCompanies = dbCompanies.find({
      $nor: [
        {
          manager: username
        },
        {
          candidateList: username
        }
      ]
    })
    .fetch();
    if (matchCompanies.length) {
      console.log(username + ' want to contend a manager!');
      const companyData = _.sample(matchCompanies);
      contendManager(user, companyData.name);
    }
  }
  if (user.profile.vote > 0 && dbProducts.find({overdue: 1}).count() > 0) {
    console.log(username + ' want to recommend some product!');
    const productList = dbProducts.find({overdue: 1}).fetch();
    for (let i = 1; i <= user.profile.vote; i += 1) {
      voteProduct(user, _.sample(productList)._id);
    }
  }
}

function randomNumber(max, min = 1) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function probability(percentage) {
  return randomNumber(100) <= percentage;
}

function generateUrl(suffix) {
  return 'http://www.google.com.tw/' + suffix;
}
