import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { stoneDisplayName, currencyFormat, sanitizeHtml } from './helpers.js';

Template.displayLog.onRendered(function() {
  this.$('[data-user-link]').each((_, elem) => {
    const $link = $(elem);
    const userId = $link.attr('data-user-link');

    // TODO write a helper
    if (userId === '!system') {
      $link.text('系統');
    }
    else if (userId === '!FSC') {
      $link.text('金管會');
    }
    else {
      $.ajax({
        url: '/userInfo',
        data: { id: userId },
        dataType: 'json',
        success: ({ name: userName, status }) => {
          if (status === 'registered') {
            const path = FlowRouter.path('accountInfo', { userId });
            $link.html(`<a href="${path}">${userName}</a>`);
          }
          else {
            $link.text(userName);
          }
        }
      });
    }
  });

  this.$('[data-company-link]').each((_, elem) => {
    const $link = $(elem);
    const companyId = $link.attr('data-company-link');
    $.ajax({
      url: '/companyInfo',
      data: { id: companyId },
      dataType: 'json',
      success: ({ name: companyName, status }) => {
        let path;
        // TODO write a helper
        switch (status) {
          case 'foundation': {
            path = FlowRouter.path('foundationDetail', { foundationId: companyId });
            break;
          }
          case 'market': {
            path = FlowRouter.path('companyDetail', { companyId });
            break;
          }
        }
        $link.html(`<a href="${path}">${companyName}</a>`);
      }
    });
  });

  this.$('[data-product-link]').each((_, elem) => {
    const $link = $(elem);
    const productId = $link.attr('data-product-link');
    $.ajax({
      url: '/productInfo',
      data: { id: productId },
      dataType: 'json',
      success: ({ url, productName }) => {
        $link.html(`<a href="${url}" target="_blank">${productName}</a>`);
      }
    });
  });
});
Template.displayLog.helpers({
  getDescriptionHtml({ logType, userId, companyId, data = {} }) {
    const company = companySpan(companyId);
    const users = userId ? userId.map(userSpan) : [];

    switch (logType) {
      case '驗證通過': {
        return `帳號驗證通過，領取起始資金$${currencyFormat(data.money)}！`;
      }
      case '登入紀錄': {
        return `${users[0]}從${data.ipAddr}登入了系統！`;
      }
      case '免費得石': {
        return `【免費得石】因為「${sanitizeHtml(data.reason)}」的理由獲得了${data.stones}顆聖晶石！`;
      }
      case '購買得石': {
        return `【購買得石】${users[0]}花費$${currencyFormat(data.cost)}購買了${data.amount}個${stoneDisplayName(data.stoneType)}！`;
      }
      case '聊天發言': {
        return `${users[0]}說道：「${sanitizeHtml(data.message)}」`;
      }
      case '發薪紀錄': {
        if (userId[0] === '!all') {
          return `【發薪紀錄】系統向所有已驗證通過且未就業的使用者發給了$${currencyFormat(data.salary)}的薪水！`;
        }

        return `【發薪紀錄】「${company}」公司向${users.join('、')}發給了$${currencyFormat(data.salary)}的薪水！`;
      }
      case '公司復活': {
        let result = `【公司復活】由於${users.join('、')}等人的投資，位於保管庫中的「${company}」公司成功復活並重新進入新創計劃，`;

        if (data.manager === '!none') {
          result += '但無人就任公司經理。';
        }
        else {
          result += `${userSpan(data.manager)}將就任公司經理。`;
        }

        return result;
      }
      case '創立公司': {
        const companyDisplay = companyId ? company : sanitizeHtml(data.companyName);

        return `【創立公司】${users[0]}發起了「${companyDisplay}」的新公司創立計劃，誠意邀請有意者投資！`;
      }
      case '參與投資': {
        const companyDisplay = companyId ? company : sanitizeHtml(data.companyName);

        return `【參與投資】${users[0]}向「${companyDisplay}」公司投資了$${currencyFormat(data.fund)}！`;
      }
      case '創立失敗': {
        return `【創立失敗】${users.join('、')}等人投資的「${sanitizeHtml(data.companyName)}公司創立計劃」由於投資人數不足失敗了，投資金額將全數返回！`;
      }
      case '創立退款': {
        const companyDisplay = companyId ? company : sanitizeHtml(data.companyName);

        return `【創立退款】${users[0]}從「${companyDisplay}公司創立計劃」收回了$${currencyFormat(data.refund)}的投資退款！`;
      }
      case '創立成功': {
        return `【創立成功】${users.join('、')}等人投資的「${company}公司創立計劃」成功了，該公司正式上市，初始股價為$${currencyFormat(data.price)}！`;
      }
      case '創立得股': {
        return `【創立得股】對「${company}公司創立計劃」的$${currencyFormat(data.fund)}投資為${users[0]}帶來了${data.stocks}數量的公司股票！`;
      }
      case '購買下單': {
        const orderType = '買入'; // FIXME 與「販賣下單」合併

        return `【購買下單】${users[0]}想要用每股$${currencyFormat(data.price)}的單價${orderType}${data.amount}數量的「${company}」公司股票！`;
      }
      case '販賣下單': {
        const orderType = '賣出'; // FIXME 與「購買下單」合併

        return `【販賣下單】${users[0]}想要用每股$${currencyFormat(data.price)}的單價${orderType}${data.amount}數量的「${company}」公司股票！`;
      }
      case '取消下單': {
        return `【取消下單】${users[0]}取消了以每股$${currencyFormat(data.price)}的單價${data.orderType}${data.amount}數量的「${company}」公司股票的訂單！`;
      }
      case '系統撤單': {
        return `【系統撤單】因商業季度結束，系統自動取消了${users[0]}以每股$${currencyFormat(data.price)}的單價${data.orderType}${data.amount}數量的「${company}」公司股票的訂單！`;
      }
      case '訂單完成': {
        if (userId[0] === '!system') {
          return `【訂單完成】${company}以每股$${currencyFormat(data.price)}的單價釋出${data.amount}數量股票的訂單已經全數交易完畢！`;
        }
        else {
          return `【訂單完成】${users[0]}以每股$${currencyFormat(data.price)}的單價${data.orderType}${data.amount}數量的「${company}」公司股票的訂單已經全數交易完畢！`;
        }
      }
      case '公司釋股': {
        return `【公司釋股】「${company}」公司以$${currencyFormat(data.price)}的價格釋出了${data.amount}數量的股票到市場上！`;
      }
      case '交易紀錄': {
        const buyer = users[0];
        const seller = userId[1] ? users[1] : `「${company}」公司`;

        return `【交易紀錄】${buyer}以$${currencyFormat(data.price)}的單價向${seller}購買了${data.amount}數量的「${company}」公司股票！`;
      }
      case '辭職紀錄': {
        return `【辭職紀錄】${users[0]}辭去了「${company}」公司的經理人職務！`;
      }
      case '撤職紀錄': {
        return `【撤職紀錄】${users[0]}以金管會的名義撤除${users[1]}於「${company}」公司的經理人職務與候選資格！`;
      }
      case '參選紀錄': {
        return `【參選紀錄】${users[0]}開始競選「${company}」公司的經理人職務！`;
      }
      case '支持紀錄': {
        return `【支持紀錄】${users[0]}開始支持${users[1]}擔任「${company}」公司的經理人。`;
      }
      case '就任經理': {
        let result = `【就任經理】${users[0]}在${data.seasonName}商業季度以${data.stocks || 0}數量的支持股份勝出，`;

        if (! userId[1] || userId[1] === '!none') {
          result += `成為了「${company}」公司的經理人。`;
        }
        else if (userId[0] === userId[1]) {
          result += `繼續擔任「${company}」公司的經理人職務。`;
        }
        else {
          result += `取代了${users[1]}成為了「${company}」公司的經理人。`;
        }

        return result;
      }
      case '經理管理': {
        return `【經理管理】${users[0]}修改了「${company}」公司的資訊！`;
      }
      case '推薦產品': {
        return `【推薦產品】${users[0]}向「${company}」公司的產品「${productSpan(data.productId)}」投了一張推薦票！`;
      }
      case '購買產品': {
        return `【購買產品】${users[0]}花費$${currencyFormat(data.cost)}買了「${company}」公司的產品「${productSpan(data.productId)}」共${data.amount}個，使該公司獲得了$${currencyFormat(data.profit)}的營利額！`;
      }
      case '員工營利': {
        return `【員工營利】${users.join('、')}等人努力工作，使「${company}」公司獲得了$${currencyFormat(data.profit)}的營利額！`;
      }
      case '公司營利': {
        return `【公司營利】「${company}」公司在本商業季度一共獲利$${currencyFormat(data.profit)}！`;
      }
      case '營利分紅': {
        return `【營利分紅】${users[0]}得到了「${company}」公司的分紅$${currencyFormat(data.bonus)}！`;
      }
      case '推薦回饋': {
        return `【推薦回饋】系統發給了${users[0]}產品投票回饋金$${currencyFormat(data.reward)}！`;
      }
      case '季度賦稅': {
        return `【季度賦稅】${users[0]}在此次商業季度中產生了$${currencyFormat(data.assetTax)}的財富稅與$${currencyFormat(data.zombieTax)}的殭屍稅！`;
      }
      case '繳納稅金': {
        return `【繳納稅金】${users[0]}向系統繳納了$${currencyFormat(data.paid)}的稅金！`;
      }
      case '繳稅逾期': {
        return `【繳稅逾期】${users[0]}由於繳稅逾期，被系統追加了$${currencyFormat(data.fine)}的稅金！`;
      }
      case '繳稅沒金': {
        return `【繳稅沒收】${users[0]}由於繳稅逾期，被系統沒收了$${currencyFormat(data.money)}的現金！`;
      }
      case '繳稅撤單': {
        return `【繳稅沒收】${users[0]}由於繳稅逾期，被系統撤銷了所有買入訂單！`;
      }
      case '繳稅沒收': {
        return `【繳稅沒收】${users[0]}由於繳稅逾期，被系統以參考價格$${currencyFormat(data.price)}沒收了「${company}」公司的股份數量${data.stocks}！`;
      }
      case '廣告宣傳': {
        return `【廣告宣傳】${users[0]}以$${currencyFormat(data.cost)}的價格發布了一則廣告：「${sanitizeHtml(data.message)}」！`;
      }
      case '廣告追加': {
        return `【廣告競價】${users[0]}追加了$${currencyFormat(data.cost)}的廣告費用在廣告：「${sanitizeHtml(data.message)}」上！`;
      }
      case '舉報違規': {
        let result = `【舉報違規】${users[0]}以「${sanitizeHtml(data.reason)}」的理由向金融管理會舉報`;

        if (companyId) {
          result += `「${company}」公司`;

          if (userId[1]) {
            result += `及其經理人${users[1]}`;
          }

          result += '的違例事項。';
        }
        else if (userId[1]) {
          result += `${users[1]}`;

          if (data.ipAddr) { // FIXME legacy condition
            result += `(${data.ipAddr})`;
          }

          result += '的違規行為。';
        }

        return result;
      }
      case '金管通告': {
        const [sourceUser, ...targetUsers] = users;

        let result = `【金管通告】${sourceUser}以金管會的名義`;

        if (companyId) { // 針對公司
          result += `向「${company}」公司`;

          if (targetUsers.length > 0) {
            result += `及其經理人${targetUsers[0]}`;
          }
        }
        else if (targetUsers.length > 0) { // 針對使用者
          result += `向${targetUsers.join('、')}`;
        }

        result += `通告：「${sanitizeHtml(data.message)}」。`;

        return result;
      }
      case '通報金管': {
        return `【通報金管】${users[0]}向金管會通報：「${sanitizeHtml(data.message)}」。`;
      }
      case '禁止舉報': { // TODO 合併「禁止」系列與「解除」系列的 code
        return `【違規處理】${users[0]}以「${sanitizeHtml(data.reason)}」的理由禁止${users[1]}今後的所有舉報違規行為。`;
      }
      case '禁止下單': { // TODO 合併「禁止」系列與「解除」系列的 code
        return `【違規處理】${users[0]}以「${sanitizeHtml(data.reason)}」的理由禁止${users[1]}今後的所有投資下單行為。`;
      }
      case '禁止聊天': { // TODO 合併「禁止」系列與「解除」系列的 code
        return `【違規處理】${users[0]}以「${sanitizeHtml(data.reason)}」的理由禁止${users[1]}今後的所有聊天發言行為。`;
      }
      case '禁止廣告': { // TODO 合併「禁止」系列與「解除」系列的 code
        return `【違規處理】${users[0]}以「${sanitizeHtml(data.reason)}」的理由禁止${users[1]}今後的所有廣告宣傳行為。`;
      }
      case '禁任經理': { // TODO 合併「禁止」系列與「解除」系列的 code
        return `【違規處理】${users[0]}以「${sanitizeHtml(data.reason)}」的理由禁止${users[1]}今後擔任經理人的資格。`;
      }
      case '解除舉報': { // TODO 合併「禁止」系列與「解除」系列的 code
        return `【解除禁令】${users[0]}以「${sanitizeHtml(data.reason)}」的理由中止了${users[1]}的舉報違規禁令。`;
      }
      case '解除下單': { // TODO 合併「禁止」系列與「解除」系列的 code
        return `【解除禁令】${users[0]}以「${sanitizeHtml(data.reason)}」的理由中止了${users[1]}的投資下單禁令。`;
      }
      case '解除聊天': { // TODO 合併「禁止」系列與「解除」系列的 code
        return `【解除禁令】${users[0]}以「${sanitizeHtml(data.reason)}」的理由中止了${users[1]}的聊天發言禁令。`;
      }
      case '解除廣告': { // TODO 合併「禁止」系列與「解除」系列的 code
        return `【解除禁令】${users[0]}以「${sanitizeHtml(data.reason)}」的理由中止了${users[1]}的廣告宣傳禁令。`;
      }
      case '解除禁任': { // TODO 合併「禁止」系列與「解除」系列的 code
        return `【解除禁令】${users[0]}以「${sanitizeHtml(data.reason)}」的理由中止了${users[1]}禁任經理人的處置。`;
      }
      case '課以罰款': {
        const target = users[1] || `「${company}」公司`;

        return `【違規處理】${users[0]}以「${sanitizeHtml(data.reason)}」的理由向${target}課以總數為$${currencyFormat(data.fine)}的罰金。`;
      }
      case '退還罰款': {
        const target = users[1] || `「${company}」公司`;

        return `【退還罰款】${users[0]}以「${sanitizeHtml(data.reason)}」的理由向${target}退還總數為$${currencyFormat(data.fine)}的罰金。`;
      }
      case '沒收股份': {
        return `【違規處理】${users[0]}以「${sanitizeHtml(data.reason)}」的理由將${users[1]}持有的「${company}」公司股份數量${data.stocks}給沒收了。`;
      }
      case '查封關停': {
        const companyDisplay = companyId ? company : '???'; // FIXME 保管庫更新期間資料錯誤的暫時處置

        return `【查封關停】${users[0]}以「${sanitizeHtml(data.reason)}」的理由查封關停了「${companyDisplay}」公司。`;
      }
      case '解除查封': {
        return `【解除查封】${users[0]}以「${sanitizeHtml(data.reason)}」的理由解除了「${company}」公司的查封關停狀態。`;
      }
      case '違規標記': {
        return `【違規標記】${users[0]}以「${sanitizeHtml(data.reason)}」的理由將「${company}」公司標記為違規！`;
      }
      case '違規解標': {
        return `【違規標記】${users[0]}移除了「${company}」公司的違規標記！`;
      }
      case '公司更名': {
        return `【公司更名】${users[0]}將「${company}」公司的名稱由「${sanitizeHtml(data.oldCompanyName)}」改為「${sanitizeHtml(data.newCompanyName)}」。`;
      }
      case '產品下架': {
        let result = `【產品下架】${users[0]}以「${sanitizeHtml(data.reason)}」的理由將「${company}」公司的產品「${sanitizeHtml(data.productName)}」給下架了`;

        if (data.profit) {
          result += `，並追回了因該產品所產生的營利$${currencyFormat(data.profit)}`;
        }

        result += '。';

        return result;
      }
      case '撤銷廣告': {
        return `【撤銷廣告】${users[0]}將${users[1]}發布的廣告「${sanitizeHtml(data.message)}」給撤銷了。`;
      }
      case '亂鬥報名': {
        return `【最萌亂鬥】${users[0]}替「${company}」公司報名參加了這一屆的最萌亂鬥大賽！`;
      }
      case '亂鬥失格': {
        return `【最萌亂鬥】「${company}」公司因為總投資金額未達標，失去了這一屆最萌亂鬥大賽的參賽資格！`;
      }
      case '亂鬥退款': {
        return `【最萌亂鬥】${users[0]}從「${company}」公司收回了$${data.refund}的投資退款！`;
      }
      case '亂鬥加強': {
        return `【最萌亂鬥】${users[0]}對這一屆最萌亂鬥大賽參賽者「${company}」公司的${data.attrName}能力值投資了$${currencyFormat(data.money)}的金錢！`;
      }
      case '亂鬥營利': {
        return `【最萌亂鬥】「${company}」公司在這一屆最萌亂鬥大賽中表現出眾，獲得了$${currencyFormat(data.reward)}的營利金額！`;
      }
      case '礦機放石': {
        return `【礦機放石】${users[0]}在「${company}」公司的挖礦機放置了一個${stoneDisplayName(data.stoneType)}！`;
      }
      case '礦機取石': {
        return `【礦機取石】${users[0]}從「${company}」公司的挖礦機拿回了一個${stoneDisplayName(data.stoneType)}！`;
      }
      case '礦機營利': {
        return `【礦機營利】「${company}」公司的挖礦機集結眾人之力努力運轉，使其獲得了$${currencyFormat(data.profit)}的營利額！`;
      }
    }
  }
});

function userSpan(userId) {
  return `<span data-user-link="${userId}"></span>`;
}

function companySpan(companyId) {
  return `<span data-company-link="${companyId}"></span>`;
}

function productSpan(productId) {
  return `<span data-product-link="${productId}"></span>`;
}
