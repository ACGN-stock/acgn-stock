import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Factory } from 'rosie';
import faker from 'faker';
import expect from 'must';
import mustSinon from 'must-sinon';
import sinon from 'sinon';

import { dbVariables } from '/db/dbVariables';
import { dbFoundations } from '/db/dbFoundations';
import { foundationFactory } from '/dev-utils/factories';
import { checkExpiredFoundations } from '/server/functions/foundation/checkExpiredFoundations';

mustSinon(expect);

describe('function checkExpiredFoundations', function() {
  this.timeout(10000);

  const { maximumInvest: maxAmountPerInvestor, foundExpireTime: foundationDurationTime } = Meteor.settings.public;

  const minInvestorCount = 10;
  const minAmountPerInvestor = 100;

  const investorFactory = new Factory()
    .sequence('userId', (n) => {
      return `user${n}`;
    })
    .attr('amount', () => {
      return faker.random.number({
        min: minAmountPerInvestor,
        max: maxAmountPerInvestor
      });
    });

  const successInvestors = investorFactory.buildList(minInvestorCount);

  let clock;

  beforeEach(function() {
    resetDatabase();
    clock = sinon.useFakeTimers(new Date());

    dbVariables.set('foundation.minInvestorCount', minInvestorCount);
    dbVariables.set('foundation.minAmountPerInvestor', minAmountPerInvestor);
  });

  afterEach(function() {
    clock.restore();
  });

  it('should process expired foundations', function() {
    const expiredSuccessfulFoundationId = dbFoundations.insert(foundationFactory.build({
      createdAt: new Date(Date.now() - foundationDurationTime - 1),
      invest: successInvestors
    }));

    const expiredFailedFoundationId = dbFoundations.insert(foundationFactory.build({
      createdAt: new Date(Date.now() - foundationDurationTime - 1),
      invest: []
    }));

    const unexpiredFoundationId = dbFoundations.insert(foundationFactory.build({
      createdAt: new Date(Date.now())
    }));

    checkExpiredFoundations();

    // sinon 沒有簡單方法 spy free functions，以 foundation 存在與否判別是否有被處理
    expect(dbFoundations.findOne(expiredSuccessfulFoundationId)).to.not.exist();
    expect(dbFoundations.findOne(expiredFailedFoundationId)).to.not.exist();
    dbFoundations.findOne(unexpiredFoundationId).must.be.exist();
  });
});
