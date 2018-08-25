import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { dbLog } from '/db/dbLog';
import { dbPrice } from '/db/dbPrice';
import { dbCompanies } from '/db/dbCompanies';
import { dbOrders } from '/db/dbOrders';
import { dbDirectors } from '/db/dbDirectors';
import { dbVips } from '/db/dbVips';
import { dbTaxes } from '/db/dbTaxes';

export function dbBulks() {
  return new DbBulks();
}

class DbBulks {
  constructor() {
    this._bulks = {};
  }

  /**
   * 幫所有呼叫過的bulk執行execute()
   * @returns {undefined} no return
   */
  execute() {
    _.forEach(this._bulks, (bulk) => {
      if (bulk) {
        Meteor.wrapAsync(bulk.execute, bulk)();
      }
    });
  }


  _getBulk(bulk, db) {
    if (! this._bulks[bulk]) {
      this._bulks[bulk] = db.rawCollection().initializeUnorderedBulkOp();
    }

    return this._bulks[bulk];
  }

  // 依照原db的命名決定bulk用單複數

  get logBulk() {
    return this._getBulk('logBulk', dbLog);
  }

  get priceBulk() {
    return this._getBulk('priceBulk', dbPrice);
  }

  // 不加s的db放上面, 有加s的放下面

  get usersBulk() {
    return this._getBulk('usersBulk', Meteor.users);
  }

  get companiesBulk() {
    return this._getBulk('companiesBulk', dbCompanies);
  }

  get ordersBulk() {
    return this._getBulk('ordersBulk', dbOrders);
  }

  get directorsBulk() {
    return this._getBulk('directorsBulk', dbDirectors);
  }

  get vipsBulk() {
    return this._getBulk('vipsBulk', dbVips);
  }

  get taxesBulk() {
    return this._getBulk('taxesBulk', dbTaxes);
  }
}
