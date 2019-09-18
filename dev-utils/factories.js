import { Meteor } from 'meteor/meteor';
import { Factory } from 'rosie';
import faker from 'faker';

import { productTypeList, productRatingList, productReplenishBaseAmountTypeList, productReplenishBatchSizeTypeList } from '/db/dbProducts';
import { orderTypeList } from '/db/dbOrders';
import { stateMap, categoryMap, violatorTypeList } from '/db/dbViolationCases';
import { actionMap } from '/db/dbViolationCaseActionLogs';

export const pttUserFactory = new Factory()
  .sequence('username', (n) => {
    return `user${n}`;
  })
  .attr('password', ['username'], (username) => {
    return username;
  })
  .attr('profile', ['username'], (username) => {
    return {
      validateType: 'PTT',
      name: username
    };
  });

export const companyFactory = new Factory()
  .attrs({
    companyName() {
      return faker.company.companyName();
    },
    founder: 'some-user',
    manager: '!none',
    chairman: '!none',
    description() {
      return faker.lorem.paragraph();
    },
    tags() {
      return faker.lorem.words(10).split(' ');
    },
    totalRelease: 1000,
    lastPrice: 128,
    listPrice: 128,
    profit: 0,
    baseProductionFund: 0,
    candidateList: [],
    voteList: [],
    createdAt() {
      return new Date();
    }
  })
  .attr('totalValue', ['totalRelease', 'listPrice'], (totalRelease, listPrice) => {
    return totalRelease * listPrice;
  })
  .attr('capital', ['totalRelease', 'listPrice'], (totalRelease, listPrice) => {
    return totalRelease * listPrice;
  })
  .attr('productPriceLimit', ['listPrice'], (listPrice) => {
    return listPrice;
  });

export const foundationFactory = new Factory()
  .attrs({
    companyName() {
      return faker.company.companyName();
    },
    founder: 'some-user',
    manager: '!none',
    description() {
      return faker.lorem.paragraph();
    },
    tags() {
      return faker.lorem.words(10).split(' ');
    },
    createdAt() {
      return new Date();
    }
  });

export const productFactory = new Factory()
  .attrs({
    productName() {
      return faker.lorem.sentence();
    },
    type() {
      return faker.random.arrayElement(productTypeList);
    },
    rating() {
      return faker.random.arrayElement(productRatingList);
    },
    url() {
      return faker.internet.url();
    },
    description() {
      return faker.lorem.sentence(20);
    },
    replenishBaseAmountType() {
      return faker.random.arrayElement(productReplenishBaseAmountTypeList);
    },
    replenishBatchSizeType() {
      return faker.random.arrayElement(productReplenishBatchSizeTypeList);
    },
    price: 1,
    totalAmount: 1,
    createdAt() {
      return new Date();
    }
  });

export const userOwnedProductFactory = new Factory()
  .attrs({
    userId() {
      return faker.random.uuid();
    },
    productId() {
      return faker.random.uuid();
    },
    amount() {
      return faker.random.number({ min: 1 });
    },
    price() {
      return faker.random.number({ min: 1 });
    },
    companyId() {
      return faker.random.uuid();
    },
    seasonId() {
      return faker.random.uuid();
    },
    createdAt() {
      return new Date();
    }
  });

export const taxFactory = new Factory()
  .attrs({
    stockTax() {
      return faker.random.number({ min: 1 });
    },
    moneyTax() {
      return faker.random.number({ min: 1 });
    },
    zombieTax() {
      return faker.random.number({ min: 1 });
    },
    fine: 0,
    paid: 0,
    expireDate() {
      return faker.date.future(0.1);
    }
  });

export const orderFactory = new Factory()
  .attrs({
    userId() {
      return faker.random.uuid();
    },
    companyId() {
      return faker.random.uuid();
    },
    orderType() {
      return faker.random.arrayElement(orderTypeList);
    },
    amount() {
      return faker.random.number({ min: 1 });
    },
    unitPrice() {
      return faker.random.number({ min: 1 });
    },
    createdAt() {
      return new Date();
    }
  });

export const seasonFactory = new Factory()
  .attr('beginDate', () => {
    return new Date();
  })
  .attr('endDate', ['beginDate'], (beginDate) => {
    return new Date(beginDate.setMinutes(0, 0, 0) + Meteor.settings.public.seasonTime);
  })
  .attrs({
    ordinal() {
      return 1;
    },
    userCount() {
      return faker.random.number({ min: 0 });
    },
    companiesCount() {
      return faker.random.number({ min: 0 });
    },
    productCount() {
      return faker.random.number({ min: 0 });
    }
  });

export const directorFactory = new Factory()
  .attrs({
    userId() {
      return faker.random.uuid();
    },
    companyId() {
      return faker.random.uuid();
    },
    stocks() {
      return faker.random.number({ min: 1 });
    },
    createdAt() {
      return new Date();
    }
  });

export const violationCasesFactory = new Factory()
  .option('violatorsNumber', faker.random.number({ min: 1, max: 100 }))
  .attr('violators', ['violatorsNumber'], getFakeViolators)
  .attrs({
    informer() {
      return faker.random.uuid();
    },
    state() {
      return faker.random.arrayElement(Object.keys(stateMap));
    },
    category() {
      return faker.random.arrayElement(Object.keys(categoryMap));
    },
    description() {
      return faker.lorem.words(10);
    },
    createdAt() {
      return faker.date.past();
    }
  })
  .attr('updatedAt', ['createdAt'], function(createdAt) {
    return faker.date.between(createdAt, new Date());
  });

export const violationCaseActionLogFactory = new Factory()
  .option('executorIdentity', 'fsc') // ['fsc', 'informer', 'violator']
  .attrs({
    violationCaseId() {
      return faker.random.uuid();
    },
    executor() {
      return faker.random.uuid();
    },
    executedAt() {
      return faker.date.past();
    }
  })
  .attr('action', ['executorIdentity'], (executorIdentity) => {
    const allowActions = Object.keys(actionMap).filter((action) => {
      return actionMap[action].allowedIdentity === executorIdentity;
    });

    return faker.random.arrayElement(allowActions);
  })
  .attr('data', ['action', 'executorIdentity'], (action) => {
    const commonData = { reason: faker.lorem.words() };

    switch (action) {
      case 'setState': {
        return {
          ...commonData,
          state: faker.random.arrayElement(Object.keys(stateMap))
        };
      }
      case 'addRelatedCase': {
        return {
          ...commonData,
          relatedCaseId: faker.random.uuid()
        };
      }
      case 'removeRelatedCase': {
        return {
          ...commonData,
          relatedCaseId: faker.random.uuid()
        };
      }
      case 'mergeViolatorsFromRelatedCase': {
        return {
          ...commonData,
          relatedCaseId: faker.random.uuid(),
          newViolators: getFakeViolators()
        };
      }
      case 'addViolator': {
        return {
          ...commonData,
          newViolators: getFakeViolators()
        };
      }
      case 'removeViolator': {
        return {
          ...commonData,
          violator: getFakeViolator()
        };
      }
      default: {
        return commonData;
      }
    }
  });

function getFakeViolators(violatorsNumber = -1) {
  if (violatorsNumber < 0) {
    violatorsNumber = faker.random.number({ min: 1, max: 100 });
  }
  const violators = new Array(violatorsNumber);
  for (let i = 0; i < violators.length; i += 1) {
    violators[i] = getFakeViolator();
  }

  return violators;
}

function getFakeViolator() {
  return {
    violatorType: faker.random.arrayElement(violatorTypeList),
    violatorId: faker.random.uuid()
  };
}
