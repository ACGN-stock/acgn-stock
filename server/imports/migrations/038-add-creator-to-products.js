import { defineMigration } from '/server/imports/utils/defineMigration';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';
import { dbProducts } from '/db/dbProducts';
import { dbLog } from '/db/dbLog';

defineMigration({
  version: 38,
  name: 'add creator to products',
  up() {
    const productBulk = dbProducts.rawCollection().initializeUnorderedBulkOp();

    dbProducts.find({}, { fields: { companyId: 1, createdAt: 1 } })
      .forEach(({ _id: productId, companyId, createdAt }) => {
        /*
         * 以產品建立時間為準，往前找出負責上架該產品的人
         * 產品建立當下公司有經理 -> 以當下的經理為建立者
         * 產品建立當下公司無經理 -> 金管會代為上架，以金管會（!FSC）為建立者
         */

        const log = dbLog.findOne({
          logType: { $in: ['創立公司', '就任經理', '辭職紀錄', '撤職紀錄'] },
          companyId,
          createdAt: { $lte: createdAt }
        }, {
          sort: { createdAt: -1 },
          fields: { userId: 1 }
        });

        const noManager = ['辭職紀錄', '撤職紀錄'].includes(log.logType);
        const creator = noManager ? '!FSC' : log.userId[0];

        productBulk.find({ _id: productId }).updateOne({ $set: { creator } });
      });

    executeBulksSync(productBulk);
  }
});
