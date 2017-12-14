import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbLog } from '/db/dbLog';
import { dbOrders } from '/db/dbOrders';
import { debug } from '/server/imports/utils/debug';

//取消所有尚未交易完畢的訂單
export function cancelAllOrder() {
  debug.log('cancelAllOrder');
  const now = new Date();
  const userOrdersCursor = dbOrders.find({});
  if (userOrdersCursor.count() > 0) {
    const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
    const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
    const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
    const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
    //紀錄整個取消過程裡金錢有增加的userId及增加量
    const increaseMoneyHash = {};
    //紀錄整個取消過程裡股份有增加的userId及增加公司及增加量
    const increaseStocksHash = {};
    userOrdersCursor.forEach((orderData) => {
      const orderType = orderData.orderType;
      const userId = orderData.userId;
      const companyId = orderData.companyId;
      const leftAmount = orderData.amount - orderData.done;
      if (orderType === '購入') {
        if (increaseMoneyHash[userId] === undefined) {
          increaseMoneyHash[userId] = 0;
        }
        increaseMoneyHash[userId] += (orderData.unitPrice * leftAmount);
      }
      else {
        if (increaseStocksHash[userId] === undefined) {
          increaseStocksHash[userId] = {};
        }
        if (increaseStocksHash[userId][companyId] === undefined) {
          increaseStocksHash[userId][companyId] = 0;
        }
        increaseStocksHash[userId][companyId] += leftAmount;
      }
      logBulk.insert({
        logType: '系統撤單',
        userId: [userId],
        companyId: companyId,
        data: {
          orderType,
          price: orderData.unitPrice,
          amount: leftAmount
        },
        createdAt: now
      });
    });
    _.each(increaseMoneyHash, (money, userId) => {
      usersBulk
        .find({
          _id: userId
        })
        .updateOne({
          $inc: {
            'profile.money': money
          }
        });
    });
    let index = 0;
    _.each(increaseStocksHash, (stocksHash, userId) => {
      //若撤銷的是系統賣單，則降低該公司的總釋股量
      if (userId === '!system') {
        _.each(stocksHash, (stocks, companyId) => {
          companiesBulk
            .find({ _id: companyId })
            .updateOne({ $inc: { totalRelease: stocks * -1 } });
        });
      }
      else {
        const createdAt = new Date(now.getTime() + index);
        index += 1;
        _.each(stocksHash, (stocks, companyId) => {
          if (dbDirectors.find({companyId, userId}).count() > 0) {
            //由於directors主鍵為Mongo Object ID，在Bulk進行find會有問題，故以companyId+userId進行搜尋更新
            directorsBulk
              .find({companyId, userId})
              .updateOne({ $inc: { stocks } });
          }
          else {
            directorsBulk.insert({
              companyId: companyId,
              userId: userId,
              stocks: stocks,
              createdAt: createdAt
            });
          }
        });
      }
    });
    if (_.size(increaseMoneyHash) > 0) {
      usersBulk.execute = Meteor.wrapAsync(usersBulk.execute);
      usersBulk.execute();
    }
    if (_.size(increaseStocksHash) > 0) {
      if (_.size(increaseStocksHash['!system']) > 0) {
        companiesBulk.execute = Meteor.wrapAsync(companiesBulk.execute);
        companiesBulk.execute();
      }
      //不是只有系統釋股單時
      if (! (_.size(increaseStocksHash) === 1 && increaseStocksHash['!system'])) {
        directorsBulk.execute = Meteor.wrapAsync(directorsBulk.execute);
        directorsBulk.execute();
      }
    }
    logBulk.execute = Meteor.wrapAsync(logBulk.execute);
    logBulk.execute();
    dbOrders.remove({});
  }
}
