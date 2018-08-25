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


  // 依照原db的命名決定bulk用單複數

  get logBulk() {
    if (! this._bulks.logBulk) {
      this._bulks.logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    }

    return this._bulks.logBulk;
  }

  get priceBulk() {
    if (! this._bulks.priceBulk) {
      this._bulks.priceBulk = dbPrice.rawCollection().initializeUnorderedBulkOp();
    }

    return this._bulks.priceBulk;
  }

  // 不加s的db放上面, 有加s的放下面

  get usersBulk() {
    if (! this._bulks.usersBulk) {
      this._bulks.usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
    }

    return this._bulks.usersBulk;
  }

  get companiesBulk() {
    if (! this._bulks.companiesBulk) {
      this._bulks.companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    }

    return this._bulks.companiesBulk;
  }

  get ordersBulk() {
    if (! this._bulks.ordersBulk) {
      this._bulks.ordersBulk = dbOrders.rawCollection().initializeUnorderedBulkOp();
    }

    return this._bulks.ordersBulk;
  }

  get directorsBulk() {
    if (! this._bulks.directorsBulk) {
      this._bulks.directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
    }

    return this._bulks.directorsBulk;
  }

  get vipsBulk() {
    if (! this._bulks.vipsBulk) {
      this._bulks.vipsBulk = dbVips.rawCollection().initializeUnorderedBulkOp();
    }

    return this._bulks.vipsBulk;
  }

  get taxesBulk() {
    if (! this._bulks.taxesBulk) {
      this._bulks.taxesBulk = dbTaxes.rawCollection().initializeUnorderedBulkOp();
    }

    return this._bulks.taxesBulk;
  }
}
