'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

Template.displayLog.onRendered(function() {
  if (this.data.userId) {
    const $link = this.$('[data-user-link]');
    _.each(this.data.userId, (userId) => {
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
        const path = FlowRouter.path('company', {companyId});
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
});
Template.displayLog.helpers({
  getDescriptionHtml(logData) {
    switch (logData.logType) {
      case '驗證通過': {
        return '帳號驗證通過，領取起始資金$' + logData.price + '！';
      }
      case '免費得石': {
        return '【免費得石】因為「' + logData.message + '」的理由獲得了' + logData.amount + '顆聖晶石！';
      }
      case '聊天發言': {
        return getUserLink(logData.userId[0]) + '說道：「' + logData.message + '」';
      }
      case '發薪紀錄': {
        return '【發薪紀錄】系統向所有已驗證通過的使用者發給了$' + logData.price + '的薪水！';
      }
      case '創立公司': {
        return (
          '【創立公司】' +
          getUserLink(logData.userId[0]) +
          '發起了「' + logData.message + '」的新公司創立計劃，誠意邀請有意者投資！'
        );
      }
      case '參與投資': {
        return (
          '【參與投資】' +
          getUserLink(logData.userId[0]) +
          '向「' + logData.message + '公司創立計劃」投資了$' + logData.amount + '！'
        );
      }
      case '創立失敗': {
        const userLinkList = _.map(logData.userId, (userId) => {
          return getUserLink(userId);
        });

        return (
          '【創立失敗】' +
          userLinkList.join('、') +
          '等人投資的「' + logData.message + '公司創立計劃」由於投資人數不足失敗了，投資金額將全數返回！'
        );
      }
      case '創立退款': {
        return (
          '【創立退款】' +
          '從「' + logData.message +
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
      case '訂單完成': {
        return (
          '【訂單完成】' + getUserLink(logData.userId[0]) +
          '以每股$' + logData.price + '的單價' + logData.message + logData.amount +
          '數量的「' + getCompanyLink(logData.companyId) + '」公司股票的訂單已經全數交易完畢！'
        );
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
      case '廣告宣傳': {
        return (
          '【廣告宣傳】' +
          getUserLink(logData.userId[0]) +
          '以$ ' + logData.price + '的價格發布了一則廣告：「' + logData.message + '」！'
        );
      }
      case '廣告追加': {
        return (
          '【廣告競價】' +
          getUserLink(logData.userId[0]) +
          '追加了$ ' + logData.price + '的廣告費用在廣告：「' + logData.message + '」上！'
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
