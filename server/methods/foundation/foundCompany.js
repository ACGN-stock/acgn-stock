import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbFoundations } from '/db/dbFoundations';
import { dbLog } from '/db/dbLog';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { getCurrentRound } from '/db/dbRound';
import { getCurrentSeason } from '/db/dbSeason';
import { checkImageUrl } from '/server/imports/utils/checkImageUrl';
import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { resourceManager } from '/server/imports/threading/resourceManager';

Meteor.methods({
  foundCompany(foundCompanyData) {
    check(this.userId, String);
    check(foundCompanyData, {
      companyName: String,
      tags: [String],
      pictureSmall: new Match.Maybe(String),
      pictureBig: new Match.Maybe(String),
      description: String
    });
    foundCompany(Meteor.user(), foundCompanyData);

    return true;
  }
});
export function foundCompany(user, foundCompanyData) {
  debug.log('foundCompany', { user, foundCompanyData });
  const { founderEarnestMoney } = Meteor.settings.public;
  const userId = user._id;
  const companyName = foundCompanyData.companyName;
  checkUserError(user);
  checkUserFoundLimitError(userId);
  checkTimeFoundLimitError();
  checkSameNameCompanyError(companyName);
  checkImageUrlError(foundCompanyData);

  // 先鎖定資源，再重新讀取一次資料進行運算
  resourceManager.throwErrorIsResourceIsLock(['user' + userId]);
  resourceManager.request('foundCompany', ['user' + userId], (release) => {
    const user = Meteor.users.findOne(userId, {
      fields: {
        'profile.money': 1
      }
    });

    checkUserMoneyError(user);
    checkUserFoundLimitError(userId);
    checkSameNameCompanyError(companyName);

    // 存放進archive中並取得_id
    foundCompanyData._id = insertOrUpdateCompanyArchive(foundCompanyData);
    foundCompanyData.founder = userId;
    foundCompanyData.manager = userId;
    const createdAt = new Date();
    foundCompanyData.createdAt = createdAt;
    dbLog.insert({
      logType: '創立公司',
      userId: [userId],
      companyId: foundCompanyData._id,
      data: { companyName },
      createdAt: createdAt
    });
    dbLog.insert({
      logType: '參與投資',
      userId: [userId],
      companyId: foundCompanyData._id,
      data: {
        companyName,
        fund: Meteor.settings.public.founderEarnestMoney
      },
      createdAt: new Date(createdAt.getTime() + 1)
    });
    Meteor.users.update(userId, {
      $inc: {
        'profile.money': -1 * founderEarnestMoney
      }
    });
    foundCompanyData.invest = [
      {
        userId: userId,
        amount: founderEarnestMoney
      }
    ];
    dbFoundations.insert(foundCompanyData);
    release();
  });
}
// 二十秒鐘最多一次
limitMethod('foundCompany', 1, 20000);


function checkUserError(user) {
  if (user.profile.isInVacation) {
    throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
  }
  if (user.profile.notPayTax) {
    throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
  }
  if (_.contains(user.profile.ban, 'manager')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了擔任經理人的資格！');
  }
  if (_.contains(user.profile.ban, 'deal')) {
    throw new Meteor.Error(403, '您現在被金融管理會禁止了所有投資下單行為！');
  }
  checkUserMoneyError(user);
}

function checkUserMoneyError(user) {
  const { founderEarnestMoney } = Meteor.settings.public;
  if (user.profile.money < founderEarnestMoney) {
    throw new Meteor.Error(401, '您的現金不足，不足以支付投資保證金！');
  }
}

function checkUserFoundLimitError(userId) {
  if (dbFoundations.find({ founder: userId }, { fields: { _id: 1 } }).count() > 0) {
    throw new Meteor.Error(403, '您現在已經有一家新創公司正在申請中，無法同時發起第二家新創公司！');
  }
}

function checkTimeFoundLimitError() {
  const { seasonTime, newRoundFoundationRestrictionTime, foundExpireTime } = Meteor.settings.public;

  const currentRound = getCurrentRound();
  if (Date.now() <= (currentRound.beginDate.getTime() + newRoundFoundationRestrictionTime)) {
    throw new Meteor.Error(403, '目前尚未開放新創計劃！');
  }
  if (Date.now() >= (currentRound.endDate.getTime() - seasonTime)) {
    throw new Meteor.Error(403, '賽季度結束前的最後一個商業季度，禁止新創計劃！');
  }

  const currentSeason = getCurrentSeason();
  // 防止換季動作與新創集資期間重疊，並預留足夠時間（10分鐘）以確保換季前最後一批新創處理完成
  if (Date.now() >= (currentSeason.endDate.getTime() - foundExpireTime - 600000)) {
    const hours = Math.ceil(foundExpireTime / 3600000);
    throw new Meteor.Error(403, '商業季度即將結束前' + hours + '小時，禁止新創計劃！');
  }
}

function checkSameNameCompanyError(companyName) {
  dbCompanyArchive.find({ companyName }, { fields: { status: 1 } }).forEach(({ status }) => {
    if (status !== 'archived') {
      throw new Meteor.Error(403, '已有相同名稱的公司上市或創立中，無法創立同名公司！');
    }
  });
}

function checkImageUrlError(foundCompanyData) {
  if (foundCompanyData.pictureBig) {
    checkImageUrl(foundCompanyData.pictureBig);
  }
  if (foundCompanyData.pictureSmall) {
    checkImageUrl(foundCompanyData.pictureSmall);
  }
}


function insertOrUpdateCompanyArchive({ companyName, tags, pictureSmall, pictureBig, description }) {
  const companyArchiveData = dbCompanyArchive.findOne({ companyName }, { fields: { _id: 1 } });
  let companyArchiveId;
  if (companyArchiveData) {
    dbCompanyArchive.update(companyArchiveData._id, {
      $set: {
        status: 'foundation',
        tags,
        pictureSmall,
        pictureBig,
        description
      }
    });
    companyArchiveId = companyArchiveData._id;
  }
  else {
    companyArchiveId = dbCompanyArchive.insert({
      status: 'foundation',
      companyName,
      tags,
      pictureSmall,
      pictureBig,
      description
    });
  }

  return companyArchiveId;
}
