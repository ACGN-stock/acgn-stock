'use strict';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbCompanies } from '../../db/dbCompanies';
import { dbProducts } from '../../db/dbProducts';
import { dbDirectors } from '../../db/dbDirectors';
import { dbOrders } from '../../db/dbOrders';
import { dbLog } from '../../db/dbLog';
import { addTask, resolveTask } from '../layout/loading';

Template.company.onCreated(function() {
  const companyName = FlowRouter.getParam('companyName');
  this.subscribe('companyDetail', companyName);
});
Template.company.helpers({
  companyData() {
    const companyName = FlowRouter.getParam('companyName');

    return dbCompanies.findOne({companyName});
  }
});

Template.companyCurrentProductList.onCreated(function() {
  this.subscribe('companyCurrentProduct', this.data.companyName);
});
Template.companyCurrentProductList.helpers({
  productList() {
    const companyName = this.companyName;
    const overdue = 1;

    return dbProducts.find({companyName, overdue}, {
      sort: {
        createdAt: -1
      }
    });
  }
});
Template.companyCurrentProductList.events({
  'click [data-vote-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-vote-product');
    Meteor.call('voteProduct', productId);
  }
});

Template.companyOldProductList.onCreated(function() {
  this.offset = 0;
  this.subscribe('companyOldProduct', this.data.companyName, this.offset);
});
Template.companyOldProductList.helpers({
  productList() {
    const companyName = this.companyName;
    const overdue = 2;

    return dbProducts.find({companyName, overdue}, {
      sort: {
        createdAt: -1
      }
    });
  }
});
Template.companyOldProductList.events({
  'click [data-action="more"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.offset += 10;
    addTask();
    templateInstance.subscribe('companyOldProduct', templateInstance.data.companyName, templateInstance.offset, resolveTask);
  }
});

Template.companyDirectorList.onCreated(function() {
  this.offset = 0;
  this.subscribe('companyDirector', this.data.companyName, this.offset);
});
Template.companyDirectorList.helpers({
  directorList() {
    const companyName = this.companyName;

    return dbDirectors.find({companyName}, {
      sort: {
        stocks: -1
      }
    });
  },
  getPercentage(stocks) {
    const templateInstance = Template.instance();

    return Math.round(stocks / templateInstance.data.totalRelease * 1000) / 100;
  }
});
Template.companyDirectorList.events({
  'click [data-action="more"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.offset += 10;
    addTask();
    templateInstance.subscribe('companyDirector', templateInstance.data.companyName, templateInstance.offset, resolveTask);
  }
});

Template.companyOrderList.onCreated(function() {
  this.offset = 0;
  this.subscribe('companyOrder', this.data.companyName, this.offset);
});
Template.companyOrderList.helpers({
  orderList() {
    const companyName = this.companyName;

    return dbOrders.find({companyName}, {
      sort: {
        orderType: 1,
        unitPrice: 1
      }
    });
  },
  getOrderDescription(orderData) {
    const {username, orderType, unitPrice, amount, done} = orderData;
    const number = amount - done;

    return `${username}以$${unitPrice}單價${orderType}數量${number}。`;
  }
});
Template.companyOrderList.events({
  'click [data-action="more"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.offset += 50;
    addTask();
    templateInstance.subscribe('companyDirector', templateInstance.data.companyName, templateInstance.offset, resolveTask);
  }
});

Template.companyLogList.onCreated(function() {
  const companyName = FlowRouter.getParam('companyName');
  this.offset = 0;
  this.subscribe('companyLog', companyName, this.offset);
});
Template.companyLogList.helpers({
  logList() {
    const companyName = FlowRouter.getParam('companyName');

    return dbLog.find({companyName}, {
      sort: {
        createdAt: -1
      }
    });
  },
  getLogDescriptionHtml(logData) {
    switch (logData.logType) {
      case '創立公司': {
        return '由' + logData.username[0] + '發起了創立計劃。';
      }
      case '參與投資': {
        return logData.username[0] + '」向創立計劃投資了$' + logData.amount + '。';
      }
      case '創立失敗': {
        return '由於參與的「' + logData.companyName + '」的新公司創立計劃失敗，領回了所有投資金額。';
      }
      case '創立成功': {
        return '公司正式創立，初始董事會成員為' + logData.username.join('、') + '。';
      }
      case '創立得股': {
        return logData.username[0] + '獲得了' + logData.amount + '數量的公司股份。';
      }
      case '公司釋股': {
        return '由於股票供不應求，公司釋出了' + logData.amount + '數量的股票到市場上。';
      }
      case '購買下單': {
        return logData.username[0] + '下達了以每股單價$' + logData.price + '的單價購入' + logData.amount + '數量股票的訂單。';
      }
      case '販賣下單': {
        return logData.username[0] + '下達了以每股單價$' + logData.price + '的單價賣出' + logData.amount + '數量股票的訂單。';
      }
      case '取消下單': {
        return logData.username[0] + '取消了以每股單價$' + logData.price + '的單價購入' + logData.amount + '數量股票的訂單。';
      }
      case '訂單完成': {
        return logData.username[0] + '以每股單價$' + logData.price + '的單價' + logData.message + logData.amount + '數量股票的訂單已全數交易完成。';
      }
      case '賣單撤銷': {
        return '由於股價低落，' + logData.username[0] + '以每股單價$' + logData.price + '的單價賣出' + logData.amount + '數量股票的訂單被系統自動取消了。';
      }
      case '交易紀錄': {
        if (logData.username[1]) {
          return logData.username[0] + '以$' + logData.price + '的單價向' + logData.username[1] + '購買了' + logData.amount + '數量的股票！';
        }
        else {
          return logData.username[0] + '以$' + logData.price + '的單價購得了' + logData.amount + '數量的釋出股票！';
        }
      }
      case '辭職紀錄': {
        return logData.username[0] + '辭去了經理人職務。';
      }
      case '參選紀錄': {
        return logData.username[0] + '參與了該商業季度的經理人競選活動。';
      }
      case '經理管理': {
        return logData.username[0] + '以經理人的身份修改了公司資訊。';
      }
      case '產品發布': {
        return logData.username[0] + '以經理人的身份籌備了一項新產品。';
      }
      case '產品下架': {
        return logData.username[0] + '以經理人的身份取消了一項新產品。';
      }
      case '推薦產品': {
        const productData = dbProducts.findOne(logData.productId);

        return logData.username[0] + '向' + (productData ? '產品「' + productData.productName + '」' : '一項產品') + '投了一張推薦票。';
      }
      case '支持紀錄': {
        return logData.username[0] + '開始支持' + logData.username[1] + '擔任經理人。';
      }
      case '就任經理': {
        return (
          '在' + logData.message + '商業季度' +
          logData.username[0] +
          (logData.amount ? ('以' + logData.amount + '數量的支持股份') : '') +
          '擊敗了所有競爭對手，' + (logData.username[1] === '!none' ? '' : '取代了' + logData.username[1]) +
          '成為了公司的經理人。'
        );
      }
      case '公司營利': {
        return '在上季推出的產品獲得了$' + logData.amount + '的營利。';
      }
      case '營利分紅': {
        return '發放了公司的營利分紅$' + logData.amount + '給' + logData.username[0] + '。';
      }
      case '舉報公司': {
        return logData.username[0] + '以「' + logData.message + '」理由舉報了公司。';
      }
      case '舉報產品': {
        const productData = dbProducts.findOne(logData.productId);

        return logData.username[0] + '以「' + logData.message + '」理由舉報了公司的' + (productData ? '產品「' + productData.productName + '」' : '一項產品') + '。';
      }
    }
  }
});
Template.companyLogList.events({
  'click [data-action="more"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.offset += 50;
    const companyName = FlowRouter.getParam('companyName');
    addTask();
    templateInstance.subscribe('companyLog', companyName, templateInstance.offset, resolveTask);
  }
});
