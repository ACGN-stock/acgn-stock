import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { dbCompanies, getPriceLimits } from '/db/dbCompanies';
import { dbFoundations } from '/db/dbFoundations';
import { dbDirectors } from '/db/dbDirectors';
import { dbOrders } from '/db/dbOrders';
import { dbProducts } from '/db/dbProducts';
import { dbResourceLock } from '/db/dbResourceLock';
import { dbVariables } from '/db/dbVariables';
import { dbVoteRecord } from '/db/dbVoteRecord';

import { addTask, resolveTask } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { handleError } from './handleError';
import { currencyFormat } from './helpers';

/*
 * 在原本的 Meteor.call 外，包裝自訂的載入狀態與錯誤處理顯示
 *
 * 為了不影響到其他使用到 Meteor.call 的部分 (e.g., 3rd-party packages)，不直接覆蓋掉 Meteor.call，
 * client 端要處理 error 時需直接使用此 function 替代 Meteor.call。
 */
Meteor.customCall = function(...args) {
  if (! Meteor.status().connected) {
    return false;
  }
  if (dbResourceLock.find('season').count()) {
    alertDialog.alert('伺服器正在忙碌中，請稍等一下吧！[503]');

    return false;
  }
  addTask();
  const lastArg = _.last(args);
  if (typeof lastArg === 'function') {
    args[args.length - 1] = function(error, result) {
      if (error) {
        handleError(error);
      }
      resolveTask();
      lastArg(error, result);
    };
  }
  else {
    args.push(function(error) {
      if (error) {
        handleError(error);
      }
      resolveTask();
    });
  }

  Meteor.call(...args);
};

export function createBuyOrder(user, companyData) {
  if (user.profile.isInVacation) {
    alertDialog.alert('您現在正在渡假中，請好好放鬆！');

    return false;
  }

  const companyId = companyData._id;
  const existsSellOrder = dbOrders.findOne({
    companyId: companyId,
    userId: user._id,
    orderType: '賣出'
  });
  if (existsSellOrder) {
    alertDialog.alert('您有賣出該公司股票的訂單正在執行中，無法同時下達購買的訂單！');

    return false;
  }
  const userMoney = user.profile.money;
  const minimumUnitPrice = getPriceLimits(companyData).lower;
  const maximumUnitPrice = getPriceLimits(companyData).upper;
  if (minimumUnitPrice > maximumUnitPrice) {
    alertDialog.alert('您的金錢不足以購買此公司的股票！');

    return false;
  }

  alertDialog.dialog({
    type: 'prompt',
    title: '股份購入',
    message: `請輸入您期望購入的每股單價：(${currencyFormat(minimumUnitPrice)}~${currencyFormat(maximumUnitPrice)})`,
    inputType: 'number',
    customSetting: `min="${minimumUnitPrice}" max="${maximumUnitPrice}"`,
    callback: function(result) {
      const unitPrice = parseInt(result, 10);
      if (! unitPrice) {
        return false;
      }
      if (unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
        alertDialog.alert('不正確的價格設定！');

        return false;
      }
      const maximumAmount = Math.floor(userMoney / unitPrice);
      if (maximumAmount < 1) {
        alertDialog.alert('您的金錢不足以購買此公司的股票！');

        return false;
      }
      alertDialog.dialog({
        type: 'prompt',
        title: '股份購入',
        message: `請輸入總購入數量：(1~${maximumAmount})`,
        inputType: 'number',
        customSetting: `min="1" max="${maximumAmount}"`,
        callback: function(result) {
          const amount = parseInt(result, 10);
          if (! amount) {
            return false;
          }
          if (amount < 1 || amount > maximumAmount) {
            alertDialog.alert('不正確的數量設定！');

            return false;
          }
          Meteor.customCall('createBuyOrder', { companyId, unitPrice, amount });
        }
      });
    }
  });
}

export function createSellOrder(user, companyData) {
  if (user.profile.isInVacation) {
    alertDialog.alert('您現在正在渡假中，請好好放鬆！');

    return false;
  }

  const userId = user._id;
  const companyId = companyData._id;
  const existsBuyOrder = dbOrders.findOne({
    companyId: companyId,
    userId: userId,
    orderType: '購入'
  });
  if (existsBuyOrder) {
    alertDialog.alert('您有買入該公司股票的訂單正在執行中，無法同時下達賣出的訂單！');

    return false;
  }
  const minimumUnitPrice = getPriceLimits(companyData).lower;
  const maximumUnitPrice = getPriceLimits(companyData).upper;
  alertDialog.dialog({
    type: 'prompt',
    title: '股份賣出',
    message: `請輸入您期望賣出的每股單價：(${currencyFormat(minimumUnitPrice)}~${currencyFormat(maximumUnitPrice)})`,
    inputType: 'number',
    customSetting: `min="${minimumUnitPrice}" max="${maximumUnitPrice}"`,
    callback: function(result) {
      const unitPrice = parseInt(result, 10);
      if (! unitPrice) {
        return false;
      }
      if (unitPrice < minimumUnitPrice || unitPrice > maximumUnitPrice) {
        alertDialog.alert('不正確的價格設定！');

        return false;
      }
      const directorData = dbDirectors.findOne({ userId, companyId });
      const maximumAmount = directorData.stocks;
      alertDialog.dialog({
        type: 'prompt',
        title: '股份賣出',
        message: `請輸入總賣出數量：(1~${maximumAmount})`,
        inputType: 'number',
        customSetting: `min="1" max="${maximumAmount}"`,
        callback: function(result) {
          const amount = parseInt(result, 10);
          if (! amount) {
            return false;
          }
          if (amount < 1 || amount > maximumAmount) {
            alertDialog.alert('不正確的數量設定！');

            return false;
          }
          Meteor.customCall('createSellOrder', { companyId, unitPrice, amount });
        }
      });
    }
  });
}

export function retrieveOrder(orderData) {
  const companyData = dbCompanies.findOne(orderData.companyId);
  if (companyData) {
    const message = `${'' +
      '確定要取消「以$'}${orderData.unitPrice}${orderData.orderType}${orderData.amount}股的「${
      companyData.companyName}」公司股份」這筆訂單嗎？（將付出手續費$1）`;
    alertDialog.confirm({
      message,
      callback: (result) => {
        if (result) {
          Meteor.customCall('retrieveOrder', orderData._id);
        }
      }
    });
  }
}

export function changeChairmanTitle(companyData) {
  const user = Meteor.user();

  if (! user) {
    alertDialog.alert('您尚未登入，無法修改董事長頭銜！');

    return false;
  }

  if (user.profile.isInVacation) {
    alertDialog.alert('您現在正在渡假中，請好好放鬆！');

    return false;
  }

  alertDialog.prompt({
    message: '要修改董事長的頭銜嗎？',
    defaultValue: companyData.chairmanTitle,
    customSetting: `minlength="1" maxlength="20"`,
    callback: (chairmanTitle) => {
      if (chairmanTitle && chairmanTitle.length > 0 && chairmanTitle.length <= 20) {
        Meteor.customCall('changeChairmanTitle', companyData._id, chairmanTitle);
      }
      else if (chairmanTitle) {
        alertDialog.alert('無效的頭銜名稱！');
      }
    }
  });
}

export function voteProduct(productId) {
  const user = Meteor.user();
  if (! user) {
    alertDialog.alert('您尚未登入，無法向產品投推薦票！');

    return false;
  }

  if (user.profile.isInVacation) {
    alertDialog.alert('您現在正在渡假中，請好好放鬆！');

    return false;
  }

  if (user.profile.voteTickets < 1) {
    alertDialog.alert('您的推薦票數量不足，無法繼續推薦產品！');

    return false;
  }
  const userId = user._id;

  const { companyId } = dbProducts.findOne(productId);

  if (dbVoteRecord.find({ companyId, userId }).count() > 0) {
    alertDialog.alert('您已在本季度對該公司的產品投過推薦票，無法繼續對同一家公司的產品投推薦票！');

    return false;
  }
  alertDialog.confirm({
    message: `您的推薦票剩餘${user.profile.voteTickets}張，確定要向產品投出推薦票嗎？`,
    callback: (result) => {
      if (result) {
        Meteor.customCall('voteProduct', productId);
      }
    }
  });
}

export function toggleFavorite(companyId) {
  const user = Meteor.user();
  if (! user) {
    alertDialog.alert('您尚未登入，無法新增我的最愛！');

    return false;
  }
  if (user.favorite.indexOf(companyId) >= 0) {
    Meteor.customCall('removeFavoriteCompany', companyId);
  }
  else {
    Meteor.customCall('addFavoriteCompany', companyId);
  }
}

export function investFoundCompany(companyId) {
  const foundationData = dbFoundations.findOne(companyId);
  const user = Meteor.user();
  if (! user) {
    alertDialog.alert('您尚未登入！');

    return false;
  }
  const userId = user._id;
  const minimumInvest = dbVariables.get('foundation.minAmountPerInvestor');
  const alreadyInvest = _.findWhere(foundationData.invest, { userId });
  const alreadyInvestAmount = alreadyInvest ? alreadyInvest.amount : 0;
  const maximumInvest = Math.min(Meteor.user().profile.money, Meteor.settings.public.maximumInvest - alreadyInvestAmount);
  if (minimumInvest > maximumInvest) {
    alertDialog.alert('您的投資已達上限或剩餘金錢不足以進行投資！');

    return false;
  }

  alertDialog.dialog({
    type: 'prompt',
    title: '投資',
    message: `
      要投資多少金額？(${currencyFormat(minimumInvest)}~${currencyFormat(maximumInvest)})
      <div class="text-danger">
        投資理財有賺有賠，請先確認您要投資的公司是否符合
        <a href="${dbVariables.get('fscRuleURL')}" target="_blank">金管會的規定</a>。
      </div>
    `,
    defaultValue: null,
    callback: function(result) {
      const amount = parseInt(result, 10);
      if (! amount) {
        return false;
      }
      if (amount >= minimumInvest && amount <= maximumInvest) {
        Meteor.customCall('investFoundCompany', companyId, amount);
      }
      else {
        alertDialog.alert('不正確的金額數字！');
      }
    }
  });
}

function askViolationCaseId(title, callback) {
  alertDialog.prompt({
    title,
    message: '請輸入案件 ID （輸入「無」以跳過）',
    callback: (result) => {
      if (! result) {
        return;
      }

      callback(result === '無' ? undefined : result);
    }
  });
}

function askReason(title, callback) {
  alertDialog.prompt({
    title,
    message: '請輸入事由：',
    callback: (reason) => {
      if (! reason) {
        return;
      }

      callback(reason);
    }
  });
}

export function adminEditProduct(productId) {
  const product = dbProducts.findOne(productId);
  const schema = dbProducts.simpleSchema().pick('type', 'rating', 'productName', 'url', 'description');

  function askProductName(callback) {
    const minLength = schema.get('productName', 'min');
    const maxLength = schema.get('productName', 'max');

    alertDialog.prompt({
      title: '修改產品 - 產品名稱',
      message: `請輸入產品名稱（${minLength}~${maxLength}字）：`,
      defaultValue: _.escape(product.productName),
      callback: (result) => {
        if (result === false) {
          return;
        }

        const trimmedResult = result.trim();

        if (trimmedResult.length < minLength) {
          alertDialog.alert(`產品名稱最少需 ${minLength} 字！`);

          return;
        }

        if (trimmedResult.length > maxLength) {
          alertDialog.alert(`產品名稱最多不超過 ${maxLength} 字！`);

          return;
        }

        callback(trimmedResult);
      }
    });
  }

  function askProductType(callback) {
    const allowedTypes = schema.get('type', 'allowedValues');

    // TODO: alertDialog 加入下拉選單
    alertDialog.prompt({
      title: '修改產品 - 產品分類',
      message: `請輸入產品分類（${allowedTypes.join('、')}）：`,
      defaultValue: product.type,
      callback: (result) => {
        if (result === false && typeof result !== 'string') {
          return;
        }

        const trimmedResult = result.trim();

        if (! allowedTypes.includes(trimmedResult)) {
          alertDialog.alert(`「${trimmedResult}」不是合法的產品分類！`);

          return;
        }

        callback(trimmedResult);
      }
    });
  }

  function askProductRating(callback) {
    const allowedTypes = schema.get('rating', 'allowedValues');

    // TODO: alertDialog 加入下拉選單
    alertDialog.prompt({
      title: '修改產品 - 產品分級',
      message: `請輸入產品分級（${allowedTypes.join('、')}）：`,
      defaultValue: product.rating,
      callback: (result) => {
        if (result === false && typeof result !== 'string') {
          return;
        }

        const trimmedResult = result.trim();

        if (! allowedTypes.includes(trimmedResult)) {
          alertDialog.alert(`「${trimmedResult}」不是合法的產品分級！`);

          return;
        }

        callback(trimmedResult);
      }
    });
  }

  function askProductUrl(callback) {
    const urlPattern = schema.get('url', 'regEx');

    alertDialog.prompt({
      title: '修改產品 - 產品網址',
      message: `請輸入產品網址：`,
      defaultValue: _.escape(product.url),
      callback: (result) => {
        if (result === false && typeof result !== 'string') {
          return;
        }

        const trimmedResult = result.trim();

        if (! urlPattern.test(trimmedResult)) {
          alertDialog.alert(`「${trimmedResult}」並非合法的網址！`);

          return;
        }

        callback(trimmedResult);
      }
    });
  }

  function askProductDescription(callback) {
    const maxLength = schema.get('description', 'max');

    alertDialog.prompt({
      title: '修改產品 - 產品描述',
      message: `請輸入產品描述（${maxLength}字以內）：`,
      defaultValue: _.escape(product.description),
      callback: (result) => {
        if (result === false) {
          return;
        }

        if (typeof result !== 'string') { // 留空時
          callback('');

          return;
        }

        const trimmedResult = result.trim();

        if (trimmedResult.length > maxLength) {
          alertDialog.alert(`產品名稱最多不超過 ${maxLength} 字！`);

          return;
        }

        callback(trimmedResult);
      }
    });
  }

  function confirmProductData(data, callback) {
    if (_.isEmpty(data)) {
      return;
    }

    const message = `
          確定將產品資訊改為以下內容？
          <ul>
            <li>分類：「${data.type}」</li>
            <li>名稱：「${data.productName}」</li>
            <li>網址：「<a href="${data.url}" target="_blank">${data.url}</a>」</li>
            <li>描述：「${data.description}」</li>
          </ul>
        `;

    alertDialog.confirm({
      title: '修改產品 - 確認修改',
      message,
      callback: (result) => {
        if (! result) {
          return;
        }

        callback(data);
      }
    });
  }

  askProductName((productName) => {
    askProductType((type) => {
      askProductRating((rating) => {
        askProductUrl((url) => {
          askProductDescription((description) => {
            const data = _.omit({ type, rating, productName, url, description }, (value) => {
              return ! value;
            });

            confirmProductData(data, (newData) => {
              askViolationCaseId('修改產品', (violationCaseId) => {
                Meteor.customCall('adminEditProduct', { productId, newData, violationCaseId });
              });
            });
          });
        });
      });
    });
  });
}

export function markCompanyIllegal(companyId) {
  const title = '設定違規標記';
  askReason(title, (reason) => {
    if (reason.length > 10) {
      alertDialog.alert('違規標記事由不可大於十個字！');

      return;
    }

    askViolationCaseId(title, (violationCaseId) => {
      Meteor.customCall('markCompanyIllegal', { companyId, reason, violationCaseId });
    });
  });
}

export function unmarkCompanyIllegal(companyId) {
  alertDialog.confirm({
    message: '是否解除違規標記？',
    callback: (result) => {
      if (! result) {
        return;
      }

      askViolationCaseId('解除違規標記', (violationCaseId) => {
        Meteor.customCall('unmarkCompanyIllegal', { companyId, violationCaseId });
      });
    }
  });
}

export function sealCompany({ _id: companyId, companyName, isSeal }) {
  const title = `${isSeal ? '解除查封' : '查封關停'} - ${companyName}`;

  askReason(title, (reason) => {
    askViolationCaseId(title, (violationCaseId) => {
      Meteor.customCall('sealCompany', { companyId, reason, violationCaseId });
    });
  });
}

export function sendFscNotice({ userIds, companyId }) {
  const title = '金管會通告';

  alertDialog.prompt({
    title,
    message: `請輸入要通告的訊息：`,
    callback: (message) => {
      if (! message) {
        return;
      }

      askViolationCaseId(title, (violationCaseId) => {
        Meteor.customCall('sendFscNotice', { userIds, companyId, message, violationCaseId });
      });
    }
  });
}

export function changeCompanyName({ _id: companyId, companyName }) {
  const title = '公司更名';
  alertDialog.dialog({
    type: 'prompt',
    title,
    message: `請輸入新的公司名稱：`,
    defaultValue: companyName,
    callback: (newCompanyName) => {
      if (! newCompanyName) {
        return;
      }

      askViolationCaseId(title, (violationCaseId) => {
        Meteor.customCall('changeCompanyName', { companyId, newCompanyName, violationCaseId });
      });
    }
  });
}

function askAmount(title, callback) {
  alertDialog.prompt({
    title,
    message: '請輸入數量：',
    inputType: 'number',
    customSetting: 'min="0"',
    callback: (amount) => {
      amount = parseInt(amount, 10);
      if (! amount || amount <= 0) {
        return;
      }
      callback(amount);
    }
  });
}

export function confiscateCompanyProfit({ _id: companyId, companyName }) {
  const title = `課以罰金 - 「${companyName}」公司`;

  askReason(title, (reason) => {
    askAmount(title, (amount) => {
      askViolationCaseId(title, (violationCaseId) => {
        Meteor.customCall('confiscateCompanyProfit', { companyId, reason, amount, violationCaseId });
      });
    });
  });
}

export function returnCompanyProfit({ _id: companyId, companyName }) {
  const title = `退還罰金 - 「${companyName}」公司`;

  askReason(title, (reason) => {
    askAmount(title, (amount) => {
      askViolationCaseId(title, (violationCaseId) => {
        Meteor.customCall('confiscateCompanyProfit', { companyId, reason, amount: -amount, violationCaseId });
      });
    });
  });
}

export function banProduct(productId) {
  const title = '違規處理 - 產品下架';
  askReason(title, (reason) => {
    askViolationCaseId(title, (violationCaseId) => {
      Meteor.customCall('banProduct', { productId, reason, violationCaseId });
    });
  });
}

export function clearUserAbout({ _id: userId, profile }) {
  const title = `清除個人簡介 - ${profile.name}`;

  askReason(title, (reason) => {
    askViolationCaseId(title, (violationCaseId) => {
      Meteor.customCall('clearUserAbout', { userId, reason, violationCaseId });
    });
  });
}

export function confiscateUserMoney({ _id: userId, profile }) {
  const title = `課以罰金 - ${profile.name}`;

  askReason(title, (reason) => {
    askAmount(title, (amount) => {
      askViolationCaseId(title, (violationCaseId) => {
        Meteor.customCall('confiscateUserMoney', { userId, reason, amount, violationCaseId });
      });
    });
  });
}

export function returnUserMoney({ _id: userId, profile }) {
  const title = `退還罰金 - ${profile.name}`;

  askReason(title, (reason) => {
    askAmount(title, (amount) => {
      askViolationCaseId(title, (violationCaseId) => {
        Meteor.customCall('confiscateUserMoney', { userId, reason, amount: -amount, violationCaseId });
      });
    });
  });
}

const banActionTextMap = {
  accuse: '禁止舉報違規',
  deal: '禁止投資下單',
  chat: '禁止聊天發言',
  advertise: '禁止廣告宣傳',
  editUserAbout: '禁止編輯個人簡介',
  manager: '禁止擔任經理'
};

export function banUser({ _id: userId, profile }, banType) {
  const banActionText = banActionTextMap[banType];
  const title = `違規處理 - ${profile.name} - ${banActionText}`;
  askReason(title, (reason) => {
    askViolationCaseId(title, (violationCaseId) => {
      Meteor.customCall('banUser', { userId, reason, banType, violationCaseId });
    });
  });
}

export function forceCancelUserOrders({ _id: userId, profile }) {
  const title = `強制撤銷訂單 - ${profile.name}`;
  askReason(title, (reason) => {
    askViolationCaseId(title, (violationCaseId) => {
      Meteor.customCall('forceCancelUserOrders', { userId, reason, violationCaseId });
    });
  });
}

export function confiscateAllUserStocks({ _id: userId, profile }) {
  const title = `沒收所有股份 - ${profile.name}`;
  askReason(title, (reason) => {
    askViolationCaseId(title, (violationCaseId) => {
      Meteor.customCall('confiscateAllUserStocks', { userId, reason, violationCaseId });
    });
  });
}

export function takeDownAdvertising({ _id: advertisingId, message }) {
  const title = '撤銷廣告';
  alertDialog.confirm({
    title,
    message: `
      <div>確定要撤銷廣告？</div>
      <div style="max-height: 100px; overflow-y: auto;">${_.escape(message)}</div>
    `,
    callback: (result) => {
      if (! result) {
        return;
      }

      askReason(title, (reason) => {
        askViolationCaseId(title, (violationCaseId) => {
          Meteor.customCall('takeDownAdvertising', { advertisingId, reason, violationCaseId });
        });
      });
    }
  });
}

export function voidAnnouncement({ announcementId }) {
  const title = '作廢公告';

  askReason(title, (reason) => {
    alertDialog.confirm({
      title,
      message: `
        <p>作廢原因：「<span class="text-info">${_.escape(reason)}</span>」</p>
        <p>公告一旦作廢將無法復原，確定要將此公告作廢嗎？</p>
      `,
      callback(result) {
        if (! result) {
          return;
        }

        Meteor.customCall('voidAnnouncement', { announcementId, reason });
      }
    });
  });
}
