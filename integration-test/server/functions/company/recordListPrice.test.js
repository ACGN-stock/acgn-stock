import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { dbCompanies } from '/db/dbCompanies';
import { companyFactory } from '/dev-utils/factories';
import { recordListPrice } from '/server/functions/company/recordListPrice';

mustSinon(expect);

describe('function recordListPrice', function() {
  this.timeout(10000);

  let companyId;
  const lastPrice = 100;
  const listPrice = 200;

  beforeEach(function() {
    resetDatabase();

    companyId = dbCompanies.insert(companyFactory.build({ lastPrice, listPrice }));
  });

  it('should update the list price to the last price', function() {
    recordListPrice();

    dbCompanies.findOne(companyId).listPrice.must.be.equal(lastPrice);
  });
});
