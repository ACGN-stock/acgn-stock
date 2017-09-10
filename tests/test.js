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

if (Meteor.users.find().count() < 1) {
  for (let i = 1; i <= 30; i += 1) {
    Accounts.createUser({
      username: 'user' + i,
      password: 'user' + i,
      profile: {
        name: 'user' + i
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
  const username = user.profile.name;
  // console.log(username + ' is doing something...');
  const foundationNumber = dbFoundations.find().count();
  const companyNumber = dbCompanies.find().count();
  if ((companyNumber + foundationNumber) < 10 && probability(25)) {
    console.log(username + ' want to found a company!');
    foundCompany(user, {
      companyName: 'company' + Date.now(),
      tags: ['forTest'],
      description: 'for test test test test',
      pictureSmall: 'http://i.imgur.com/R8uBw0k.jpg',
      pictureBig: 'http://i.imgur.com/R8uBw0k.jpg'
    });
  }
  else if (foundationNumber > 0) {
    const investMoney = randomNumber(Math.round(user.profile.money / 4), 100);
    if (investMoney > 100 && user.profile.money > investMoney) {
      console.log(username + ' want to invest a found company!');
      const foundationData = dbFoundations.findOne({}, {
        skip: randomNumber(foundationNumber, 0)
      });
      investFoundCompany(user, foundationData._id, investMoney);
      user.profile.money -= investMoney;
    }
  }
  const orderList = dbOrders.find({userId}).fetch();
  if (orderList.length > 0 && probability(50)) {
    console.log(username + ' want to cancel a order!');
    const orderData = _.sample(orderList);
    retrieveOrder(user, orderData._id);
  }
  const sellOrderList = _.where(orderList, {
    orderType: '賣出'
  });
  const sellOrderCompanyIdList = _.chain(sellOrderList)
    .pluck('companyId')
    .unique()
    .value();
  const canBuyStockCompanyList = dbCompanies
    .find(
      {
        companyName: {
          $nin: sellOrderCompanyIdList
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
  if (canBuyStockCompanyList.length > 0 && probability(25)) {
    const companyData = _.sample(canBuyStockCompanyList);
    const minPrice = Math.ceil(companyData.listPrice * 0.85);
    if (user.profile.money > minPrice) {
      const useMoney = randomNumber(user.profile.money);
      const maxPrice = Math.min(useMoney, Math.floor(companyData.listPrice * 1.15));
      const unitPrice = randomNumber(maxPrice, minPrice);
      const amount = Math.floor(useMoney / unitPrice);
      if (amount > 0) {
        console.log(username + ' want to buy stocks of 「' + companyData.companyName + '」!');
        const orderData = {
          companyId: companyData._id,
          unitPrice: unitPrice || 1,
          amount: amount
        };
        createBuyOrder(user, orderData);
        orderList.push(orderData);
        user.profile.money -= (unitPrice * amount);
      }
    }
  }
  const buyOrderList = _.where(orderList, {
    orderType: '購入'
  });
  const buyOrderCompanyIdList = _.chain(buyOrderList)
    .pluck('companyId')
    .unique()
    .value();
  const canSellStockList = dbDirectors
    .find(
      {
        username: username,
        companyName: {
          $nin: buyOrderCompanyIdList
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
    const companyId = directorData.companyId;
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        companyName: 1,
        listPrice: 1,
        candidateList: 1,
        voteList: 1
      },
      disableOplog: true
    });
    if (probability(50)) {
      console.log(username + ' want to sell some stocks of 「' + companyData.companyName + '」!');

      createSellOrder(user, {
        companyId: companyId,
        unitPrice: randomNumber(Math.floor(companyData.listPrice * 1.15), Math.ceil(companyData.listPrice * 0.85)),
        amount: probability(10) ? directorData.stocks : randomNumber(directorData.stocks)
      });
    }
    else {
      const candidateIndex = randomNumber(companyData.candidateList.length) - 1;
      if (! _.contains(companyData.voteList[candidateIndex], username)) {
        console.log(username + ' support a candidate!');
        supportCandidate(user, companyId, companyData.candidateList[candidateIndex]);
      }
    }
  }

  const beManagerCompanies = dbCompanies.find({manager: username}).fetch();
  if (beManagerCompanies.length) {
    if (probability(5)) {
      console.log(username + ' want to resign a manager!');
      const companyData = _.sample(beManagerCompanies);
      resignManager(user, companyData.companyId);
    }
    else if (dbProducts.find().count() < 12) {
      console.log(username + ' want to create a product!');
      const companyData = _.sample(beManagerCompanies);
      const randomSuffix = Date.now();
      createProduct(user, {
        productName: 'product' + randomSuffix,
        companyId: companyData.companyId,
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
              manager: userId
            },
            {
              candidateList: userId
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
      contendManager(user, companyData._id);
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
