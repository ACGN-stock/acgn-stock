import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Factory } from 'rosie';
import faker from 'faker';
import expect from 'must';
import mustSinon from 'must-sinon';
import sinon from 'sinon';

import { dbFoundations } from '/db/dbFoundations';
import { foundationFactory } from '/dev-utils/factories';
import { checkExpiredFoundations } from '/server/functions/foundation/checkExpiredFoundations';

mustSinon(expect);

const investorFactory = new Factory()
  .sequence('userId', (n) => {
    return `user${n}`;
  })
  .attr('amount', () => {
    return faker.random.number({
      min: Math.ceil(Meteor.settings.public.minReleaseStock / Meteor.settings.public.foundationNeedUsers),
      max: Meteor.settings.public.maximumInvest
    });
  });

describe('function checkExpiredFoundations', function() {
  const successInvestors = investorFactory.buildList(Meteor.settings.public.foundationNeedUsers);

  let clock;

  beforeEach(function() {
    resetDatabase();
    clock = sinon.useFakeTimers(new Date());
  });

  afterEach(function() {
    clock.restore();
  });

  it('should process expired foundations', function() {
    const expiredSuccessfulFoundationId = dbFoundations.insert(foundationFactory.build({
      createdAt: new Date(Date.now() - Meteor.settings.public.foundExpireTime - 1),
      invest: successInvestors
    }));

    const expiredFailedFoundationId = dbFoundations.insert(foundationFactory.build({
      createdAt: new Date(Date.now() - Meteor.settings.public.foundExpireTime - 1),
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
