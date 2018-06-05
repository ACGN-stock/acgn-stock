import { Meteor } from 'meteor/meteor';
import { MongoInternals } from 'meteor/mongo';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbLog, logTypeList } from '/db/dbLog';

defineMigration({
  version: 14,
  name: 'adjust log schema and indexing logType',
  async up() {
    await dbLog.rawCollection().createIndex({ logType: 1, createdAt: -1 });

    const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    let runBulk = false;

    logTypeList.forEach((logType) => {
      // 跳過無資料的狀況
      if (dbLog.find({ logType, data: { $exists: false } }).count() === 0) {
        return;
      }

      const bulkCursor = logBulk.find({
        logType,
        data: { $exists: false }
      });

        // 將與 indexes 無關的 fields 移至 data，並重新給予適當名稱
      switch (logType) {
        case '驗證通過':
          bulkCursor.update({
            $rename: {
              price: 'data.money'
            }
          });
          runBulk = true;
          break;

        case '登入紀錄':
          bulkCursor.update({
            $rename: {
              message: 'data.ipAddr'
            }
          });
          runBulk = true;
          break;

        case '免費得石':
          bulkCursor.update({
            $rename: {
              message: 'data.reason',
              amount: 'data.stones'
            }
          });
          runBulk = true;
          break;

        case '聊天發言':
          bulkCursor.update({
            $rename: {
              message: 'data.message'
            }
          });
          runBulk = true;
          break;

        case '發薪紀錄':
          bulkCursor.update({
            $rename: {
              price: 'data.salary'
            }
          });
          runBulk = true;
          break;

        case '公司復活':
          bulkCursor.update({
            $rename: {
              message: 'data.manager'
            }
          });
          runBulk = true;
          break;

        case '創立公司':
          bulkCursor.update({
            $rename: {
              message: 'data.companyName'
            }
          });
          runBulk = true;
          break;

        case '參與投資':
          bulkCursor.update({
            $rename: {
              message: 'data.companyName',
              amount: 'data.fund'
            }
          });
          runBulk = true;
          break;

        case '創立失敗':
          bulkCursor.update({
            $rename: {
              message: 'data.companyName'
            }
          });
          runBulk = true;
          break;

        case '創立退款':
          bulkCursor.update({
            $rename: {
              message: 'data.companyName',
              amount: 'data.refund'
            }
          });
          runBulk = true;
          break;

        case '創立成功':
          bulkCursor.update({
            $rename: {
              price: 'data.price'
            }
          });
          runBulk = true;
          break;

        case '創立得股':
          bulkCursor.update({
            $rename: {
              price: 'data.fund',
              amount: 'data.stocks'
            }
          });
          runBulk = true;
          break;

        case '購買下單':
        case '販賣下單':
        case '公司釋股':
        case '交易紀錄':
          bulkCursor.update({
            $rename: {
              price: 'data.price',
              amount: 'data.amount'
            }
          });
          runBulk = true;
          break;

        case '取消下單':
        case '系統撤單':
        case '訂單完成':
          bulkCursor.update({
            $rename: {
              message: 'data.orderType',
              price: 'data.price',
              amount: 'data.amount'
            }
          });
          runBulk = true;
          break;

        case '就任經理':
          bulkCursor.update({
            $rename: {
              message: 'data.seasonName',
              amount: 'data.stocks'
            }
          });
          runBulk = true;
          break;

        case '推薦產品':
          bulkCursor.update({
            $rename: {
              productId: 'data.productId',
              price: 'data.profit'
            }
          });
          runBulk = true;
          break;

        case '員工營利':
          bulkCursor.update({
            $rename: {
              price: 'data.profit'
            }
          });
          runBulk = true;
          break;

        case '公司營利':
          bulkCursor.update({
            $rename: {
              amount: 'data.profit'
            }
          });
          runBulk = true;
          break;

        case '營利分紅':
          bulkCursor.update({
            $rename: {
              amount: 'data.bonus'
            }
          });
          runBulk = true;
          break;

        case '季度賦稅':
          bulkCursor.update({
            $rename: {
              amount: 'data.assetTax',
              price: 'data.zombieTax'
            }
          });
          runBulk = true;
          break;

        case '繳納稅金':
          bulkCursor.update({
            $rename: {
              amount: 'data.paid'
            }
          });
          runBulk = true;
          break;

        case '繳稅逾期':
          bulkCursor.update({
            $rename: {
              amount: 'data.fine'
            }
          });
          runBulk = true;
          break;

        case '繳稅沒金':
          bulkCursor.update({
            $rename: {
              amount: 'data.money'
            }
          });
          runBulk = true;
          break;

        case '繳稅沒收':
          bulkCursor.update({
            $rename: {
              price: 'data.price',
              amount: 'data.stocks'
            }
          });
          runBulk = true;
          break;

        case '廣告宣傳':
        case '廣告追加':
          bulkCursor.update({
            $rename: {
              price: 'data.cost',
              message: 'data.message'
            }
          });
          runBulk = true;
          break;

        case '舉報違規':
          dbLog
            .find({
              logType,
              data: { $exists: false }
            })
            .forEach((logData) => {
              logBulk
                .find({ _id: new MongoInternals.NpmModule.ObjectID(logData._id._str) })
                .update({
                  $rename: {
                    message: 'data.reason'
                  },
                  $set: {
                    'data.ipAddr': logData.userId[2],
                    userId: logData.userId.slice(0, 2)
                  }
                });
            });
          runBulk = true;
          break;

        case '金管通告':
        case '通報金管':
          bulkCursor.update({
            $rename: {
              message: 'data.message'
            }
          });
          runBulk = true;
          break;

        case '禁止舉報':
        case '禁止下單':
        case '禁止聊天':
        case '禁止廣告':
        case '禁任經理':
        case '解除舉報':
        case '解除下單':
        case '解除聊天':
        case '解除廣告':
        case '解除禁任':
        case '查封關停':
        case '解除查封':
          bulkCursor.update({
            $rename: {
              message: 'data.reason'
            }
          });
          runBulk = true;
          break;

        case '課以罰款':
        case '退還罰款':
          bulkCursor.update({
            $rename: {
              message: 'data.reason',
              amount: 'data.fine'
            }
          });
          runBulk = true;
          break;

        case '沒收股份':
          bulkCursor.update({
            $rename: {
              message: 'data.reason',
              amount: 'data.stocks'
            }
          });
          runBulk = true;
          break;

        case '公司更名':
          bulkCursor.update({
            $rename: {
              message: 'data.oldCompanyName'
            }
          });
          runBulk = true;
          break;

        case '產品下架':
          bulkCursor.update({
            $rename: {
              productId: 'data.productId',
              message: 'data.reason',
              price: 'data.profit'
            }
          });
          runBulk = true;
          break;

        case '撤銷廣告':
          bulkCursor.update({
            $rename: {
              message: 'data.message'
            }
          });
          runBulk = true;
          break;

        case '亂鬥報名':
          break;

        case '亂鬥加強':
          bulkCursor.update({
            $rename: {
              message: 'data.attrName',
              amount: 'data.money'
            }
          });
          runBulk = true;
          break;

        case '亂鬥營利':
          bulkCursor.update({
            $rename: {
              amount: 'data.reward'
            }
          });
          runBulk = true;
          break;
      }
    });

    if (runBulk) {
      Meteor.wrapAsync(logBulk.execute, logBulk)();
    }
  }
});
