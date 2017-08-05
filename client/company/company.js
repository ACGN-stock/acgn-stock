'use strict';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbCompanies } from '../../db/dbCompanies';
import { dbProducts } from '../../db/dbProducts';
import { dbDirectors } from '../../db/dbDirectors';
import { dbOrders } from '../../db/dbOrders';
import { dbLog } from '../../db/dbLog';
import { dbPrice } from '../../db/dbPrice';
import { addTask, resolveTask } from '../layout/loading';
import { createBuyOrder, createSellOrder, retrieveOrder } from '../utils/methods';

Template.company.onCreated(function() {
  const companyName = FlowRouter.getParam('companyName');
  addTask();
  this.subscribe('companyDetail', companyName, resolveTask);
});
Template.company.helpers({
  companyData() {
    const companyName = FlowRouter.getParam('companyName');

    return dbCompanies.findOne({companyName});
  },
  isManager(manager) {
    const user = Meteor.user();
    const username = user && user.username;

    return username === manager;
  },
  getManageHref(companyName) {
    return FlowRouter.path('manageCompany', {companyName});
  }
});

Template.companyDetail.onRendered(function() {
  const companyName = this.data.companyName;
  this.$chart = this.$('.chart');
  this.chart = null;
  this.autorun(() => {
    if (this.chart) {
      this.chart.destroy();
    }
    this.$chart
      .empty()
      .html('<canvas style="max-height:300px;"></canvas>');
    const ctx = this.$chart.find('canvas');
    const data = dbPrice
      .find({companyName}, {
        sort: {
          createdAt: 1
        }
      })
      .map((priceData) => {
        return {
          x: priceData.createdAt.getTime(),
          y: priceData.price
        };
      });
    this.chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: '股價走勢',
            lineTension: 0,
            data: data
          }
        ]
      },
      options: {
        responsive: true,
        animation: {
          duration: 0
        },
        legend: {
          onClick: $.noop
        },
        scales: {
          xAxes: [
            {
              type: 'time',
              position: 'bottom',
              gridLines: {
                drawTicks: true
              },
              scaleLabel: {
                display: false
              },
              ticks: {
                autoSkip: true,
                autoSkipPadding: 10,
                round: true,
                maxRotation: 0,
                padding: 5
              },
              time: {
                parser: 'x',
                tooltipFormat: 'YYYY/MM/DD HH:mm:ss',
                displayFormats: {
                  year: 'YYYY',
                  quarter: 'YYYY Qo',
                  month: 'YYYY/MM',
                  week: 'YYYY/MM/DD',
                  day: 'YYYY/MM/DD',
                  hour: 'MM/DD HH:mm',
                  minute: 'MM/DD HH:mm',
                  second: 'HH:mm:ss',
                  millisecond: 'mm:ss.SSS'
                }
              }
            }
          ],
          yAxes: [
            {
              type: 'linear',
              position: 'left',
              gridLines: {
                drawTicks: true
              },
              ticks: {
                beginAtZero: true,
                callback: function(value) {
                  return '$' + value;
                }
              }
            }
          ]
        }
      }
    });
  });
});
Template.companyDetail.helpers({
  priceDisplayClass(lastPrice, listPrice) {
    if (lastPrice > listPrice) {
      return 'col text-right text-danger';
    }
    else if (listPrice > lastPrice) {
      return 'col text-right text-success';
    }
    else {
      return 'col text-right';
    }
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

const rDirectorOffset = new ReactiveVar(0);
Template.companyDirectorList.onCreated(function() {
  rDirectorOffset.set(0);
  this.subscribe('queryOwnStocks', this.data.companyName);
  this.subscribe('companyDirector', this.data.companyName, rDirectorOffset.get());
});
Template.companyDirectorList.helpers({
  directorList() {
    const companyName = this.companyName;

    return dbDirectors.find({companyName}, {
      sort: {
        stocks: -1
      },
      limit: rDirectorOffset.get() + 10
    });
  },
  getPercentage(stocks) {
    const templateInstance = Template.instance();

    return Math.round(stocks / templateInstance.data.totalRelease * 10000) / 100;
  },
  heveMore() {
    const companyName = this.companyName;

    return (rDirectorOffset.get() + 10) <= dbDirectors.find({companyName}).count();
  }
});
Template.companyDirectorList.events({
  'click [data-action="more"]'(event, templateInstance) {
    event.preventDefault();
    rDirectorOffset.set(rDirectorOffset.get() + 10);
    addTask();
    templateInstance.subscribe('companyDirector', templateInstance.data.companyName, rDirectorOffset.get(), resolveTask);
  }
});

const rOrderOffset = new ReactiveVar(0);
Template.companyOrderList.onCreated(function() {
  rOrderOffset.set(0);
  this.subscribe('companyOrder', this.data.companyName, rOrderOffset.get());
  this.subscribe('queryMyOrder');
});
Template.companyOrderList.helpers({
  getStockAmount() {
    const user = Meteor.user();
    const username = user && user.username;
    const companyName = this.companyName;
    const ownStockData = dbDirectors.findOne({username, companyName});

    return ownStockData ? ownStockData.stocks : 0;
  },
  myOrderList() {
    const companyName = this.companyName;
    const user = Meteor.user();
    const username = user && user.username;

    return dbOrders.find(
      {
        companyName: companyName,
        username: username
      }, {
        sort: {
          createdAt: -1
        },
        limit: rDirectorOffset.get() + 10
      }
    );
  },
  orderList() {
    const companyName = this.companyName;
    const user = Meteor.user();
    const username = user && user.username;

    return dbOrders.find(
      {
        companyName: companyName,
        username: {
          $ne: username
        }
      },
      {
        sort: {
          orderType: 1,
          unitPrice: 1
        },
        limit: rOrderOffset.get() + 10
      }
    );
  },
  getOrderDescription(orderData) {
    const {username, orderType, unitPrice, amount, done} = orderData;
    const number = amount - done;

    return `${username}以$${unitPrice}單價${orderType}數量${number}。`;
  },
  heveMore() {
    const companyName = this.companyName;
    const user = Meteor.user();
    const username = user && user.username;
    const orderCount = dbOrders
      .find({
        companyName: companyName,
        username: {
          $ne: username
        }
      })
      .count();

    return (rOrderOffset.get() + 10) <= orderCount;
  }
});
Template.companyOrderList.events({
  'click [data-action="createBuyOrder"]'(event, templateInstance) {
    event.preventDefault();
    createBuyOrder(Meteor.user(), templateInstance.data);
  },
  'click [data-action="createSellOrder"]'(event, templateInstance) {
    event.preventDefault();
    createSellOrder(Meteor.user(), templateInstance.data);
  },
  'click [data-cancel-order]'(event) {
    event.preventDefault();
    const orderId = $(event.currentTarget).attr('data-cancel-order');
    const orderData = dbOrders.findOne(orderId);
    retrieveOrder(orderData);
  },
  'click [data-action="more"]'(event, templateInstance) {
    event.preventDefault();
    rOrderOffset.set(rOrderOffset.get() + 10);
    addTask();
    templateInstance.subscribe('companyOrder', templateInstance.data.companyName, rOrderOffset.get(), resolveTask);
  }
});

const rLogOffset = new ReactiveVar(0);
Template.companyLogList.onCreated(function() {
  const companyName = FlowRouter.getParam('companyName');
  rLogOffset.set(0);
  this.subscribe('companyLog', companyName, rLogOffset.get());
});
Template.companyLogList.helpers({
  logList() {
    const companyName = FlowRouter.getParam('companyName');

    return dbLog.find({companyName}, {
      sort: {
        createdAt: -1
      },
      limit: rLogOffset.get() + 50
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
        return logData.username[0] + '取消了以每股單價$' + logData.price + '的單價' + logData.message + logData.amount + '數量股票的訂單。';
      }
      case '訂單完成': {
        return logData.username[0] + '以每股單價$' + logData.price + '的單價' + logData.message + logData.amount + '數量股票的訂單已全數交易完成。';
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
  },
  haveMore() {
    const companyName = FlowRouter.getParam('companyName');
    const logCount = dbLog.find({companyName}).count();

    return (rLogOffset.get() + 50) <= logCount;
  }
});
Template.companyLogList.events({
  'click [data-action="more"]'(event, templateInstance) {
    event.preventDefault();
    rLogOffset.set(rLogOffset.get() + 50);
    const companyName = FlowRouter.getParam('companyName');
    addTask();
    templateInstance.subscribe('companyLog', companyName, rLogOffset.get(), resolveTask);
  }
});
