'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

Template.displayLog.onRendered(function() {
  if (this.data.userId) {
    const $link = this.$('[data-user-link]');
    _.each(this.data.userId, (userId) => {
      if (userId === '!system') {
        $link.text('系統');
      }
      else if (userId === '!FSC') {
        $link.text('金管會');
      }
      else {
        $.ajax({
          url: '/userName',
          data: {
            id: userId
          },
          success: (userName) => {
            const path = FlowRouter.path('accountInfo', {userId});
            $link
              .filter('[data-user-link="' + userId + '"]')
              .html(`
                <a href="${path}">${userName}</a>
              `);
          }
        });
      }
    });
  }
  const companyId = this.data.companyId;
  if (companyId) {
    const $link = this.$('[data-company-link]');
    $.ajax({
      url: '/companyName',
      data: {
        id: companyId
      },
      success: (companyName) => {
        const path = FlowRouter.path('companyDetail', {companyId});
        $link
          .filter('[data-company-link="' + companyId + '"]')
          .html(`
            <a href="${path}">${companyName}</a>
          `);
      }
    });
  }
  const productId = this.data.productId;
  if (productId) {
    const $link = this.$('[data-product-link]');
    $.ajax({
      url: '/productName',
      data: {
        id: productId
      },
      dataType: 'json',
      success: (productData) => {
        $link
          .filter('[data-product-link="' + productId + '"]')
          .html(`
            <a href="${productData.url}" target="_blank">${productData.productName}</a>
          `);
      }
    });
  }
  if (this.data.message) {
    this.$('[data-message]').text(this.data.message);
  }
});
Template.displayLog.helpers({
  getDescriptionHtml(logData) {
    switch (logData.logType) {
      case '驗證通過': {
        return '帳號驗證通過，領取起始資金$' + logData.price + '！';
      }
      case '登入紀錄': {
        return getUserLink(logData.userId[0]) + '從' + logData.message + '登入了系統！';
      }
      case '免費得石': {
        return '【免費得石】因為「' + logData.message + '」的理由獲得了' + logData.amount + '顆聖晶石！';
      }
      case '聊天發言': {
        return getUserLink(logData.userId[0]) + '說道：「' + getPureMessage() + '」';
      }
      case '發薪紀錄': {
        return '【發薪紀錄】系統向所有已驗證通過的使用者發給了$' + logData.price + '的薪水！';
      }
      case '創立公司': {
        return (
          '【創立公司】' +
          getUserLink(logData.userId[0]) +
          '發起了「' + getPureMessage() + '」的新公司創立計劃，誠意邀請有意者投資！'
        );
      }
      case '參與投資': {
        return (
          '【參與投資】' +
          getUserLink(logData.userId[0]) +
          '向「' + getPureMessage() + '公司創立計劃」投資了$' + logData.amount + '！'
        );
      }
      case '創立失敗': {
        const userLinkList = _.map(logData.userId, (userId) => {
          return getUserLink(userId);
        });

        return (
          '【創立失敗】' +
          userLinkList.join('、') +
          '等人投資的「' + getPureMessage() + '公司創立計劃」由於投資人數不足失敗了，投資金額將全數返回！'
        );
      }
      case '創立退款': {
        return (
          '【創立退款】' +
          '從「' + getPureMessage() +
          '公司創立計劃」收回了$' + logData.amount + '的投資退款！'
        );
      }
      case '創立成功': {
        const userLinkList = _.map(logData.userId, (userId) => {
          return getUserLink(userId);
        });

        return (
          '【創立成功】' +
          userLinkList.join('、') +
          '等人投資的「' + getCompanyLink(logData.companyId) +
          '公司創立計劃」成功了，該公司正式上市，初始股價為$' + logData.price + '！'
        );
      }
      case '創立得股': {
        return (
          '【創立得股】' +
          '對「' + getCompanyLink(logData.companyId) +
          '公司創立計劃」的$' + logData.price + '投資為' + getUserLink(logData.userId[0]) + '帶來了' +
          logData.amount + '數量的公司股票！'
        );
      }
      case '購買下單': {
        return (
          '【購買下單】' +
          getUserLink(logData.userId[0]) +
          '想要用每股$' + logData.price + '的單價購買' + logData.amount +
          '數量的「' + getCompanyLink(logData.companyId) + '」公司股票！'
        );
      }
      case '販賣下單': {
        return (
          '【販賣下單】' +
          getUserLink(logData.userId[0]) +
          '想要用每股$' + logData.price + '的單價販賣' + logData.amount +
          '數量的「' + getCompanyLink(logData.companyId) + '」公司股票！'
        );
      }
      case '取消下單': {
        return (
          '【取消下單】' +
          getUserLink(logData.userId[0]) +
          '取消了以每股$' + logData.price + '的單價' + logData.message + logData.amount +
          '數量的「' + getCompanyLink(logData.companyId) + '」公司股票的訂單！'
        );
      }
      case '系統撤單': {
        return (
          '【系統撤單】因商業季度結束，系統自動取消了' +
          getUserLink(logData.userId[0]) +
          '以每股＄' + logData.price + '的單價' + logData.message + logData.amount +
          '數量的「' + getCompanyLink(logData.companyId) + '」公司股票的訂單！'
        );
      }
      case '訂單完成': {
        if (logData.userId[0] === '!system') {
          return (
            '【訂單完成】' + getCompanyLink(logData.companyId) +
            '以每股$' + logData.price + '的單價釋出' + logData.amount +
            '數量股票的訂單已經全數交易完畢！'
          );
        }
        else {
          return (
            '【訂單完成】' + getUserLink(logData.userId[0]) +
            '以每股$' + logData.price + '的單價' + logData.message + logData.amount +
            '數量的「' + getCompanyLink(logData.companyId) + '」公司股票的訂單已經全數交易完畢！'
          );
        }
      }
      case '公司釋股': {
        return (
          '【公司釋股】' +
          '「' + getCompanyLink(logData.companyId) + '」公司以$' +
          logData.price + '的價格釋出了' + logData.amount + '數量的股票到市場上套取利潤！'
        );
      }
      case '交易紀錄': {
        return (
          '【交易紀錄】' +
          getUserLink(logData.userId[0]) + '以$' + logData.price + '的單價向' +
          (logData.userId[1] ? getUserLink(logData.userId[1]) : '「' + getCompanyLink(logData.companyId) + '」公司') +
          '購買了' + logData.amount + '數量的「' +
          getCompanyLink(logData.companyId) + '」公司股票！'
        );
      }
      case '辭職紀錄': {
        return (
          '【辭職紀錄】' +
          getUserLink(logData.userId[0]) +
          '辭去了「' + getCompanyLink(logData.companyId) + '」公司的經理人職務！'
        );
      }
      case '撤職紀錄': {
        return (
          '【撤職紀錄】' +
          getUserLink(logData.userId[1]) +
          '被金融管理委員會撤除了「' + getCompanyLink(logData.companyId) + '」公司的經理人職務與候選資格！'
        );
      }
      case '參選紀錄': {
        return (
          '【參選紀錄】' +
          getUserLink(logData.userId[0]) +
          '開始競選「' + getCompanyLink(logData.companyId) +
          '」公司的經理人職務！'
        );
      }
      case '支持紀錄': {
        return (
          '【支持紀錄】' +
          getUserLink(logData.userId[0]) +
          '開始支持' + getUserLink(logData.userId[1]) +
          '擔任「' + getCompanyLink(logData.companyId) + '」公司的經理人。'
        );
      }
      case '就任經理': {
        let extraDescription = '';
        if (logData.userId[1] === '!none') {
          extraDescription = '成為了公司的經理人。';
        }
        else if (logData.userId[0] === logData.userId[1]) {
          extraDescription = '繼續擔任「' + getCompanyLink(logData.companyId) + '」公司的經理人職務。';
        }
        else {
          extraDescription = '取代了' + getUserLink(logData.userId[1]) + '成為了「' + getCompanyLink(logData.companyId) + '」公司的經理人。';
        }

        return (
          '【就任經理】' +
          getUserLink(logData.userId[0]) + '在' + logData.message + '商業季度' +
          (logData.amount ? ('以' + logData.amount + '數量的支持股份') : '') +
          '擊敗了所有競爭對手，' + extraDescription
        );
      }
      case '經理管理': {
        return (
          '【經理管理】' +
          getUserLink(logData.userId[0]) +
          '修改了「' + getCompanyLink(logData.companyId) + '」公司的資訊！'
        );
      }
      case '推薦產品': {
        return (
          '【推薦產品】' +
          getUserLink(logData.userId[0]) +
          '向「' + getCompanyLink(logData.companyId) +
          '」公司的產品「' + getProductLink(logData.productId) + '」投了一張推薦票' +
          '，使其獲得了$' + logData.price + '的營利額！'
        );
      }
      case '公司營利': {
        return (
          '【公司營利】' +
          '「' + getCompanyLink(logData.companyId) +
          '」公司在本商業季度一共獲利$' + logData.amount + '！'
        );
      }
      case '營利分紅': {
        return (
          '【營利分紅】' + getUserLink(logData.userId[0]) +
          '得到了「' + getCompanyLink(logData.companyId) +
          '」公司的分紅$' + logData.amount + '！'
        );
      }
      case '季度賦稅': {
        return (
          '【季度賦稅】' + getUserLink(logData.userId[0]) +
          '在此次商業季度中產生了$' + logData.amount + '的財富稅與$' +
          logData.price + '的殭屍稅！'
        );
      }
      case '繳納稅金': {
        return (
          '【繳納稅金】' + getUserLink(logData.userId[0]) +
          '向系統繳納了$' + logData.amount + '的稅金！'
        );
      }
      case '繳稅逾期': {
        return (
          '【繳稅逾期】' + getUserLink(logData.userId[0]) +
          '由於繳稅逾期，被系統追加了$' + logData.amount + '的稅金！'
        );
      }
      case '繳稅撤單': {
        return (
          '【繳稅撤單】' + getUserLink(logData.userId[0]) +
          '由於繳稅逾期，被系統撤銷了所有買入訂單！'
        );
      }
      case '繳稅沒收': {
        return (
          '【繳稅沒收】' + getUserLink(logData.userId[0]) +
          '由於繳稅逾期，被系統以參考價格$' + logData.price + '沒收了「' +
          getCompanyLink(logData.companyId) +
          '」公司的股份數量' + logData.amount + '！'
        );
      }
      case '廣告宣傳': {
        return (
          '【廣告宣傳】' +
          getUserLink(logData.userId[0]) +
          '以$ ' + logData.price + '的價格發布了一則廣告：「' + getPureMessage() + '」！'
        );
      }
      case '廣告追加': {
        return (
          '【廣告競價】' +
          getUserLink(logData.userId[0]) +
          '追加了$ ' + logData.price + '的廣告費用在廣告：「' + getPureMessage() + '」上！'
        );
      }
      case '舉報違規': {
        let extraDescription = '';
        if (logData.userId[1]) {
          extraDescription = (
            getUserLink(logData.userId[1]) +
            (logData.userId[2] ? '(' + logData.userId[2] + ')' : '') +
            '的違規行為'
          );
        }
        else if (logData.productId) {
          extraDescription = getProductLink(logData.productId) + '的違例事項';
        }
        else {
          extraDescription = getCompanyLink(logData.companyId) + '的違例事項';
        }

        return (
          '【舉報違規】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由向金融管理會舉報' + extraDescription + '。'
        );
      }
      case '禁止舉報': {
        return (
          '【違規處理】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由禁止' +
          getUserLink(logData.userId[1]) + '今後的所有舉報違規行為。'
        );
      }
      case '禁止下單': {
        return (
          '【違規處理】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由禁止' +
          getUserLink(logData.userId[1]) + '今後的所有投資下單行為。'
        );
      }
      case '禁止聊天': {
        return (
          '【違規處理】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由禁止' +
          getUserLink(logData.userId[1]) + '今後的所有聊天發言行為。'
        );
      }
      case '禁止廣告': {
        return (
          '【違規處理】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由禁止' +
          getUserLink(logData.userId[1]) + '今後的所有廣告宣傳行為。'
        );
      }
      case '課以罰款': {
        return (
          '【違規處理】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由向' +
          getUserLink(logData.userId[1]) + '課以總數為$' + logData.amount + '的罰金。'
        );
      }
      case '沒收股份': {
        return (
          '【違規處理】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由將' +
          getUserLink(logData.userId[1]) + '持有的「' +
          getCompanyLink(logData.companyId) + '」公司股份數量' + logData.amount + '給沒收了。'
        );
      }
      case '禁任經理': {
        return (
          '【違規處理】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由禁止' +
          getUserLink(logData.userId[1]) + '今後擔任經理人的資格。'
        );
      }
      case '解除舉報': {
        return (
          '【解除禁令】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由中止了' +
          getUserLink(logData.userId[1]) + '的舉報違規禁令。'
        );
      }
      case '解除下單': {
        return (
          '【解除禁令】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由中止了' +
          getUserLink(logData.userId[1]) + '的投資下單禁令。'
        );
      }
      case '解除聊天': {
        return (
          '【解除禁令】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由中止了' +
          getUserLink(logData.userId[1]) + '的聊天發言禁令。'
        );
      }
      case '解除廣告': {
        return (
          '【解除禁令】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由中止了' +
          getUserLink(logData.userId[1]) + '的廣告宣傳禁令。'
        );
      }
      case '退還罰款': {
        return (
          '【退還罰款】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由向' +
          getUserLink(logData.userId[1]) + '退還總數為$' + logData.amount + '的罰金。'
        );
      }
      case '解除禁任': {
        return (
          '【解除禁令】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由中止了' +
          getUserLink(logData.userId[1]) + '今後禁任經理人的處置。'
        );
      }
      case '查封關停': {
        return (
          '【查封關停】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由查封關停了「' +
          getCompanyLink(logData.companyId) + '」公司。'
        );
      }
      case '解除查封': {
        return (
          '【解除查封】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由解除了「' +
          getCompanyLink(logData.companyId) + '」公司的查封關停狀態。'
        );
      }
      case '產品下架': {
        return (
          '【產品下架】' +
          getUserLink(logData.userId[0]) +
          '以「' + getPureMessage() + '」的理由將「' +
          getCompanyLink(logData.companyId) + '」公司的產品「' +
          getProductLink(logData.productId) + '」給下架了' +
          (logData.price ? '，並追回了因該產品所產生的營利$' + logData.price + '。' : '。')
        );
      }
      case '撤銷廣告': {
        return (
          '【撤銷廣告】' +
          getUserLink(logData.userId[0]) +
          '將' + getUserLink(logData.userId[1]) +
          '發布的廣告「「' + getPureMessage() + 'message」給撤銷了。'
        );
      }
    }
  }
});

function getUserLink(userId) {
  return `<span data-user-link="${userId}"></span>`;
}

function getCompanyLink(companyId) {
  return `<span data-company-link="${companyId}"></span>`;
}

function getProductLink(productId) {
  return `<span data-product-link="${productId}"></span>`;
}

function getPureMessage() {
  return `<span data-message></span>`;
}
