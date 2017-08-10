'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { dbFoundations } from '../db/dbFoundations';
import { dbCompanies } from '../db/dbCompanies';
import { dbOrders } from '../db/dbOrders';
import { dbDirectors } from '../db/dbDirectors';
import { dbProducts } from '../db/dbProducts';
import { foundCompany, investFoundCompany } from '../server/methods/foundation';
import { createBuyOrder, createSellOrder, retrieveOrder } from '../server/methods/order';
import { createProduct, voteProduct } from '../server/methods/product';
import { resignManager, contendManager, supportCandidate } from '../server/methods/company';
import { config } from '../config';

if (Meteor.users.find().count() < 1) {
  for (let i = 1; i <= 30; i += 1) {
    Accounts.createUser({
      username: 'user' + i,
      password: 'user' + i,
      profile: {
        money: config.beginMoney
      }
    });
  }
}

Meteor.users.find().forEach((user) => {
  doSomethingAfterRandomTime(user._id);
});

function doSomethingAfterRandomTime(userId) {
  const randomTime = randomNumber(60000, 30000);
  Meteor.setTimeout(() => {
    // try {
    //   doSomething(userId);
    // }
    // catch(e) {
    //   console.log(e);
    // }
    doSomething(userId);
    doSomethingAfterRandomTime(userId);
  }, randomTime);
}

function doSomething(userId) {
  const user = Meteor.users.findOne(userId);
  const username = user.username;
  // console.log(username + ' is doing something...');
  const foundationNumber = dbFoundations.find().count();
  const companyNumber = dbCompanies.find().count();
  if ((companyNumber + foundationNumber) < 3 && probability(25)) {
    console.log(username + ' want to found a company!');
    foundCompany(user, {
      companyName: 'company' + Date.now(),
      tags: ['forTest'],
      description: 'for test test test test'
    });
  }
  else if (foundationNumber > 0 && user.profile.money > 5000) {
    const investMoney = randomNumber(user.profile.money - 200, 500);
    if (investMoney > 100) {
      console.log(username + ' want to invest a found company!');
      const foundationData = dbFoundations.findOne({}, {
        skip: randomNumber(foundationNumber, 0)
      });
      investFoundCompany(user, foundationData.companyName, investMoney);
    }
  }
  const orderList = dbOrders.find({username}).fetch();
  if (probability(orderList * 2)) {
    console.log(username + ' want to cancel a order!');
    const orderData = _.sample(orderList);
    retrieveOrder(user, orderData._id);
  }
  const sellOrderList = _.where(orderList, {
    orderType: '賣出'
  });
  const sellOrderCompanyNameList = _.chain(sellOrderList)
    .pluck('companyName')
    .unique()
    .value();
  const canBuyStockCompanyList = dbCompanies
    .find(
      {
        companyName: {
          $nin: sellOrderCompanyNameList
        }
      },
      {
        fields: {
          companyName: 1,
          listPrice: 1
        },
        disableOplog: true
      }
    )
    .fetch();
  if (canBuyStockCompanyList.length > 0 && probability(50)) {
    const companyData = _.sample(canBuyStockCompanyList);
    const useMoney = randomNumber(user.profile.money);
    const minPrice = Math.ceil(companyData.listPrice / 2);
    if (useMoney > minPrice) {
      const unitPrice = randomNumber(Math.min(useMoney, companyData.listPrice * 2), Math.min(useMoney, minPrice));
      const amount = Math.floor(useMoney / unitPrice);
      if (amount > 0) {
        console.log(username + ' want to buy stocks of 「' + companyData.companyName + '」!');
        createBuyOrder(user, {
          companyName: companyData.companyName,
          unitPrice: unitPrice || 1,
          amount: amount
        });
      }
    }
  }
  const buyOrderList = _.where(orderList, {
    orderType: '購入'
  });
  const buyOrderCompanyNameList = _.chain(buyOrderList)
    .pluck('companyName')
    .unique()
    .value();
  const canSellStockList = dbDirectors
    .find(
      {
        username: username,
        companyName: {
          $nin: buyOrderCompanyNameList
        }
      },
      {
        fields: {
          companyName: 1,
          stocks: 1
        },
        disableOplog: true
      }
    )
    .fetch();
  if (canSellStockList.length > 0) {
    const directorData = _.sample(canSellStockList);
    const companyName = directorData.companyName;
    const companyData = dbCompanies.findOne({companyName}, {
      fields: {
        companyName: 1,
        listPrice: 1,
        candidateList: 1,
        voteList: 1
      },
      disableOplog: true
    });
    if (probability(50)) {
      console.log(username + ' want to sell some stocks of 「' + companyName + '」!');

      createSellOrder(user, {
        companyName: companyName,
        unitPrice: randomNumber(companyData.listPrice * 2, Math.ceil(companyData.listPrice / 2)),
        amount: probability(10) ? directorData.stocks : randomNumber(directorData.stocks)
      });
    }
    else {
      const candidateIndex = randomNumber(companyData.candidateList.length) - 1;
      if (! _.contains(companyData.voteList[candidateIndex], username)) {
        console.log(username + ' support a candidate!');
        supportCandidate(user, companyName, companyData.candidateList[candidateIndex]);
      }
    }
  }

  const beManagerCompanies = dbCompanies.find({manager: username}).fetch();
  if (beManagerCompanies.length) {
    if (probability(5)) {
      console.log(username + ' want to resign a manager!');
      const companyData = _.sample(beManagerCompanies);
      resignManager(user, companyData.companyName);
    }
    else if (dbProducts.find().count() < 12) {
      console.log(username + ' want to create a product!');
      const companyData = _.sample(beManagerCompanies);
      const randomSuffix = Date.now();
      createProduct(user, {
        productName: 'product' + randomSuffix,
        companyName: companyData.companyName,
        type: '繪圖',
        url: generateUrl(randomSuffix)
      });
    }
  }
  else if (probability(5)) {
    const matchCompanies = dbCompanies
      .find(
        {
          $nor: [
            {
              manager: username
            },
            {
              candidateList: username
            }
          ]
        },
        {
          fields: {
            companyName: 1
          },
          disableOplog: true
        }
      )
      .fetch();
    if (matchCompanies.length) {
      console.log(username + ' want to contend a manager!');
      const companyData = _.sample(matchCompanies);
      contendManager(user, companyData.companyName);
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
