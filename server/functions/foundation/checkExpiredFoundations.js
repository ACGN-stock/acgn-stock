import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { resourceManager } from '/server/imports/threading/resourceManager';
import { dbFoundations } from '/db/dbFoundations';
import { dbLog } from '/db/dbLog';
import { dbCompanies } from '/db/dbCompanies';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbDirectors } from '/db/dbDirectors';
import { dbPrice } from '/db/dbPrice';
import { debug } from '/server/imports/utils/debug';

const { foundExpireTime, foundationNeedUsers, minReleaseStock } = Meteor.settings.public;

// 檢查所有已截止的新創公司
export function checkExpiredFoundations() {
  debug.log('checkExpiredFoundations');

  const expiredFoundationCreatedAt = new Date(Date.now() - foundExpireTime);

  dbFoundations
    .find({
      createdAt: { $lt: expiredFoundationCreatedAt }
    }, {
      fields: { _id: 1 },
      disableOplog: true
    })
    .forEach(({ _id: companyId }) => {
      //先鎖定資源，再重新讀取一次資料進行運算
      resourceManager.request('checkExpiredFoundations', [`foundation${companyId}`], (release) => {
        const foundationData = dbFoundations.findOne(companyId);
        if (! foundationData) {
          release();

          return;
        }

        if (foundationData.invest.length >= foundationNeedUsers) {
          doOnFoundationSuccess(foundationData);
        }
        else {
          doOnFoundationFailure(foundationData);
        }

        release();
      });
    });
}

// 由投資狀況計算初始股價
function calculateInitialPrice(investors) {
  const totalFund = _.reduce(investors, (sum, investorData) => {
    return sum + investorData.amount;
  }, 0);

  if (totalFund === 0) {
    throw new Meteor.Error('something went wrong: totalFund === 0');
  }

  let price = 1;
  while (Math.ceil(totalFund / price / 2) > minReleaseStock) {
    price *= 2;
  }

  return price;
}

// 以指定股價計算投資人的配股與退款
function calculateDirectors(investors, price) {
  return _.map(investors, ({userId, amount}) => {
    const stocks = Math.floor(amount / price);
    const refund = amount - (price * stocks);

    return { userId, stocks, refund };
  });
}

// 計算投資人的配股與退款、初始股價與初始釋股數
function processStockOffering(investors) {
  let price = calculateInitialPrice(investors);

  let directors;
  let totalRelease;

  do {
    if (price < 1) {
      throw new Meteor.Error('something went wrong: price < 1');
    }

    directors = calculateDirectors(investors, price);

    totalRelease = _.reduce(directors, (sum, directorData) => {
      return sum + directorData.stocks;
    }, 0);

    // 確保股數在最小限制之上，否則股價折半重新計算
    if (totalRelease < minReleaseStock) {
      price = Math.floor(price / 2);
    }
  }
  while (totalRelease < minReleaseStock);

  return { directors, price, totalRelease };
}

// 新創公司成功之處理
export function doOnFoundationSuccess(foundationData) {
  const { _id: companyId, invest } = foundationData;

  const { directors, price, totalRelease } = processStockOffering(invest);

  const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const directorsBulk = dbDirectors.rawCollection().initializeUnorderedBulkOp();
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();

  const basicCreatedAt = new Date();

  logBulk.insert({
    logType: '創立成功',
    userId: _.pluck(invest, 'userId'),
    companyId: companyId,
    data: { price },
    createdAt: basicCreatedAt
  });

  const candidateList = [];
  if (foundationData.manager !== '!none') {
    candidateList.push(foundationData.manager);
  }

  const voteList = candidateList.map(() => {
    return [];
  });

  const companySchema = dbCompanies.simpleSchema();
  const newCompanyData = companySchema.clean({
    companyName: foundationData.companyName,
    manager: foundationData.manager,
    chairman: '!none',
    chairmanTitle: '董事長',
    tags: foundationData.tags,
    pictureSmall: foundationData.pictureSmall,
    pictureBig: foundationData.pictureBig,
    description: foundationData.description,
    illegalReason: foundationData.illegalReason,
    capital: totalRelease * price,
    totalRelease: totalRelease,
    lastPrice: price,
    listPrice: price,
    totalValue: totalRelease * price,
    candidateList: candidateList,
    voteList: voteList,
    createdAt: basicCreatedAt
  });
  companySchema.validate(newCompanyData);

  companiesBulk.insert({
    _id: companyId,
    ...newCompanyData
  });

  dbPrice.insert({
    companyId: companyId,
    price: price,
    createdAt: basicCreatedAt
  });

  let needExecuteDirectorsBulk = false;
  let needExecuteUserBulk = false;

  directors.forEach(({ userId, stocks, refund }, index) => {
    const createdAt = new Date(basicCreatedAt.getTime() + index + 1);
    if (stocks > 0) {
      logBulk.insert({
        logType: '創立得股',
        userId: [userId],
        companyId: companyId,
        data: {
          fund: (price * stocks) + refund,
          stocks
        },
        createdAt: createdAt
      });
      needExecuteDirectorsBulk = true;
      directorsBulk.insert({ companyId, userId, stocks, createdAt });
    }
    if (refund > 0) {
      logBulk.insert({
        logType: '創立退款',
        userId: [userId],
        companyId: companyId,
        data: {
          companyName: foundationData.companyName, // TODO lagecy field
          refund: refund
        },
        createdAt: createdAt
      });
      needExecuteUserBulk = true;
      usersBulk
        .find({_id: userId})
        .updateOne({ $inc: { 'profile.money': refund } });
    }
  });

  Meteor.wrapAsync(companiesBulk.execute).call(companiesBulk);
  Meteor.wrapAsync(logBulk.execute).call(logBulk);

  if (needExecuteDirectorsBulk) {
    Meteor.wrapAsync(directorsBulk.execute).call(directorsBulk);
  }

  if (needExecuteUserBulk) {
    Meteor.wrapAsync(usersBulk.execute).call(usersBulk);
  }

  dbFoundations.remove(companyId);
  dbCompanyArchive.update(companyId, { $set: { status: 'market' } });
}

// 新創公司失敗之處理
export function doOnFoundationFailure(foundationData) {
  const { _id: companyId, invest, companyName, manager } = foundationData;

  const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
  const usersBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();

  const createdAt = new Date();

  logBulk.insert({
    logType: '創立失敗',
    userId: _.union([manager], _.pluck(invest, 'userId')),
    data: { companyName },
    createdAt: createdAt
  });

  invest.forEach(({ userId, amount }, index) => {
    if (userId === foundationData.manager) {
      amount -= Meteor.settings.public.founderEarnestMoney;
    }

    logBulk.insert({
      logType: '創立退款',
      userId: [userId],
      data: {
        companyName: foundationData.companyName,
        refund: amount
      },
      createdAt: new Date(createdAt.getTime() + index + 1)
    });

    usersBulk
      .find({_id: userId})
      .updateOne({ $inc: { 'profile.money': amount } });
  });

  dbFoundations.remove(companyId);
  dbCompanyArchive.remove(companyId);

  logBulk
    .find({ companyId })
    .update({ $unset: { companyId: 1 } });

  Meteor.wrapAsync(logBulk.execute).call(logBulk);
  if (foundationData.invest.length > 0) {
    Meteor.wrapAsync(usersBulk.execute).call(usersBulk);
  }
}
