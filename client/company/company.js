'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbCompanies } from '../../db/dbCompanies';
import { dbDirectors } from '../../db/dbDirectors';
import { dbLog } from '../../db/dbLog';
import { dbOrders } from '../../db/dbOrders';
import { dbProducts } from '../../db/dbProducts';
import { dbResourceLock } from '../../db/dbResourceLock';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { createBuyOrder, createSellOrder, retrieveOrder, changeChairmanTitle, voteProduct, likeProduct } from '../utils/methods';

inheritedShowLoadingOnSubscribing(Template.company);
const rDirectorOffset = new ReactiveVar(0);
const rBuyOrderOffset = new ReactiveVar(0);
const rSellOrderOffset = new ReactiveVar(0);
const rLogOffset = new ReactiveVar(0);
const rTodayDealAmount = new ReactiveVar(0);
const rPriceList = new ReactiveVar([]);
Template.company.onCreated(function() {
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    if (Meteor.user()) {
      this.subscribe('queryMyOrder');
      this.subscribe('queryOwnStocks');
      const companyName = FlowRouter.getParam('companyName');
      if (companyName) {
        this.subscribe('queryMyLike', companyName);
      }
    }
  });
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const companyName = FlowRouter.getParam('companyName');
    if (companyName) {
      this.subscribe('companyDetail', companyName);
      this.subscribe('companyCurrentProduct', companyName);
      this.subscribe('queryChairmanAsVariable', companyName);
      this.subscribe('productListByCompany', {
        companyName: companyName,
        sortBy: 'likeCount',
        sortDir: -1,
        offset: 0
      });
    }
  });
  rDirectorOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const companyName = FlowRouter.getParam('companyName');
    if (companyName) {
      this.subscribe('companyDirector', companyName, rDirectorOffset.get());
    }
  });
  rBuyOrderOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const companyName = FlowRouter.getParam('companyName');
    if (companyName) {
      this.subscribe('companyOrderExcludeMe', companyName, '購入', rBuyOrderOffset.get());
    }
  });
  rSellOrderOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const companyName = FlowRouter.getParam('companyName');
    if (companyName) {
      this.subscribe('companyOrderExcludeMe', companyName, '賣出', rSellOrderOffset.get());
    }
  });
  rLogOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const companyName = FlowRouter.getParam('companyName');
    if (companyName) {
      this.subscribe('companyLog', companyName, rLogOffset.get());
    }
  });
  queryDealAmountAndPrice();
  this.intervalId = Meteor.setInterval(queryDealAmountAndPrice, 30000);
});
Template.company.onDestroyed(function() {
  Meteor.clearInterval(this.intervalId);
});
function queryDealAmountAndPrice() {
  if (dbResourceLock.find('season').count()) {
    return false;
  }
  const companyName = FlowRouter.getParam('companyName');
  if (companyName) {
    Meteor.nativeCall('queryTodayDealAmount', companyName, (error, result) => {
      if (! error) {
        rTodayDealAmount.set(result);
      }
    });
    Meteor.nativeCall('queryStocksPrice', companyName, (error, result) => {
      if (! error) {
        rPriceList.set(result);
      }
    });
  }
}

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
Template.company.events({
  'click [data-action="changeChairmanTitle"]'() {
    event.preventDefault();
    const companyName = FlowRouter.getParam('companyName');
    const companyData = dbCompanies.findOne({companyName});
    changeChairmanTitle(companyData);
  },
  'click [data-action="resignManager"]'(event) {
    event.preventDefault();
    const companyName = FlowRouter.getParam('companyName');
    const message = '你確定要辭去「' + companyName + '」的經理人職務？\n請輸入「' + companyName + '」以表示確定。';
    const confirmMessage = window.prompt(message);
    if (confirmMessage === companyName) {
      Meteor.call('resignManager', companyName);
    }
  }
});

Template.companyDetail.onCreated(function() {
  this.rPicture = new ReactiveVar('');
  $.ajax({
    url: '/companyPicture',
    data: {
      id: this.data._id.toHexString(),
      type: 'big'
    },
    success: (response) => {
      console.log(response);
      this.rPicture.set(response);
    }
  });
});
Template.companyDetail.onRendered(function() {
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
    this.chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: '一日股價走勢',
            lineTension: 0,
            data: rPriceList.get()
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
  getPicture() {
    const templateInstance = Template.instance();

    return templateInstance.rPicture.get();
  },
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
  },
  getTodayDealAmount() {
    return rTodayDealAmount.get();
  }
});

Template.companyBuyOrderList.helpers({
  myOrderList() {
    const companyName = this.companyName;
    const user = Meteor.user();
    if (user) {
      const username = user.username;

      return dbOrders.find(
        {
          companyName: companyName,
          orderType: '購入',
          username: username
        },
        {
          sort: {
            createdAt: -1
          }
        }
      );
    }
  },
  orderList() {
    const companyName = this.companyName;
    const filter = {
      companyName: companyName,
      orderType:  '購入'
    };
    const user = Meteor.user();
    if (user) {
      filter.username = {
        $ne: user.username
      };
    }

    return dbOrders.find(filter, {
      sort: {
        unitPrice: -1,
        createdAt: 1
      },
      limit: 10
    });
  },
  getOrderDescription(orderData) {
    const {username, orderType, unitPrice, amount, done} = orderData;
    const number = amount - done;

    return `${username}以$${unitPrice}單價${orderType}數量${number}。`;
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfCompanyOrder購入',
      dataNumberPerPage: 10,
      offset: rBuyOrderOffset
    };
  }
});
Template.companyBuyOrderList.events({
  'click [data-action="createBuyOrder"]'(event, templateInstance) {
    event.preventDefault();
    createBuyOrder(Meteor.user(), templateInstance.data);
  },
  'click [data-cancel-order]'(event) {
    event.preventDefault();
    const orderId = $(event.currentTarget).attr('data-cancel-order');
    const orderData = dbOrders.findOne(orderId);
    retrieveOrder(orderData);
  }
});

Template.companySellOrderList.helpers({
  getStockAmount() {
    return getStockAmount(this.companyName);
  },
  myOrderList() {
    const companyName = this.companyName;
    const user = Meteor.user();
    if (user) {
      const username = user.username;

      return dbOrders.find(
        {
          companyName: companyName,
          orderType: '賣出',
          username: username
        },
        {
          sort: {
            createdAt: -1
          },
          limit: rSellOrderOffset.get() + 10
        }
      );
    }
  },
  orderList() {
    const companyName = this.companyName;
    const filter = {
      companyName: companyName,
      orderType:  '賣出'
    };
    const user = Meteor.user();
    if (user) {
      filter.username = {
        $ne: user.username
      };
    }

    return dbOrders.find(filter, {
      sort: {
        unitPrice: 1,
        createdAt: 1
      },
      limit: 10
    });
  },
  getOrderDescription(orderData) {
    const username = orderData.username === '!system' ? orderData.companyName : orderData.username;
    const {orderType, unitPrice, amount, done} = orderData;
    const number = amount - done;

    return `${username}以$${unitPrice}單價${orderType}數量${number}。`;
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfCompanyOrder賣出',
      dataNumberPerPage: 10,
      offset: rSellOrderOffset
    };
  }
});
Template.companySellOrderList.events({
  'click [data-action="createSellOrder"]'(event, templateInstance) {
    event.preventDefault();
    createSellOrder(Meteor.user(), templateInstance.data);
  },
  'click [data-cancel-order]'(event) {
    event.preventDefault();
    const orderId = $(event.currentTarget).attr('data-cancel-order');
    const orderData = dbOrders.findOne(orderId);
    retrieveOrder(orderData);
  }
});

function getStockAmount(companyName) {
  const user = Meteor.user();
  if (user) {
    const username = user.username;
    const ownStockData = dbDirectors.findOne({username, companyName});

    return ownStockData ? ownStockData.stocks : 0;
  }
  else {
    return 0;
  }
}

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
    voteProduct(productId);
  }
});

Template.companyAllPrudctList.helpers({
  productCenterHref() {
    return FlowRouter.path('productCenterByCompany', {
      companyName: this.companyName
    });
  },
  productList() {
    const companyName = this.companyName;

    return dbProducts.find({companyName}, {
      sort: {
        likeCount: -1,
        createdAt: -1
      }
    });
  }
});
Template.companyAllPrudctList.events({
  'click [data-like-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-like-product');
    const companyName = FlowRouter.getParam('companyName');
    likeProduct(productId, companyName);
  }
});

Template.companyDirectorList.helpers({
  directorList() {
    const companyName = this.companyName;

    return dbDirectors.find({companyName}, {
      sort: {
        stocks: -1,
        createdAt: 1
      }
    });
  },
  getPercentage(stocks) {
    const templateInstance = Template.instance();

    return Math.round(stocks / templateInstance.data.totalRelease * 10000) / 100;
  },
  getMessage(message) {
    return message || '無';
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfCompanyDirector',
      dataNumberPerPage: 10,
      offset: rDirectorOffset
    };
  },
  getMyMessage(companyName) {
    const username = Meteor.user().username;

    return dbDirectors.findOne({username, companyName}).message;
  },
  getStockAmount(companyName) {
    return getStockAmount(companyName);
  }
});
Template.companyDirectorList.events({
  'submit form'(event, templateInstance) {
    event.preventDefault();
    const message = templateInstance.$('[name="message"]').val();
    Meteor.call('directorMessage', templateInstance.data.companyName, message);
  }
});

Template.companyElectInfo.helpers({
  inElect() {
    const candidateList = this.candidateList;

    return candidateList && candidateList.length > 1;
  },
  canContendManager() {
    const user = Meteor.user();
    if (user && ! user.profile.revokeQualification) {
      return ! _.contains(this.candidateList, user.username);
    }

    return false;
  },
  getSupportPercentage(candidateIndex) {
    const instanceData = Template.instance().data;
    const supportStocksList = instanceData.supportStocksList;
    const supportStocks = supportStocksList ? supportStocksList[candidateIndex] : 0;

    return Math.round(supportStocks / instanceData.totalRelease * 10000) / 100;
  },
  getSupportList(candidateIndex) {
    const instance = Template.instance();
    const voteList = instance.data.voteList[candidateIndex];

    if (voteList.length > 0) {
      return voteList.join('、');
    }
    else {
      return '無';
    }
  },
  getStockAmount() {
    const instance = Template.instance();
    const instanceData = instance.data;

    return getStockAmount(instanceData.companyName);
  }
});
Template.companyElectInfo.events({
  'click [data-action="contendManager"]'(event, templateInstance) {
    event.preventDefault();
    const instanceData = templateInstance.data;
    const companyName = instanceData.companyName;
    if (window.confirm('你確定要競選擔任「' + companyName + '」的經理人嗎？')) {
      Meteor.call('contendManager', companyName);
    }
  },
  'click [data-support-candidate]'(event, templateInstance) {
    event.preventDefault();
    const instanceData = templateInstance.data;
    const candidateList = instanceData.candidateList;
    const candidateIndex = parseInt($(event.currentTarget).attr('data-support-candidate'), 10);
    const candidate = candidateList[candidateIndex];
    if (window.confirm('你確定要支持候選人「' + candidate + '」嗎？')) {
      Meteor.call('supportCandidate', instanceData.companyName, candidate);
    }
  }
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
        return logData.username[0] + '向創立計劃投資了$' + logData.amount + '。';
      }
      case '創立成功': {
        return '公司正式創立，初始董事會成員為' + logData.username.join('、') + '。';
      }
      case '創立得股': {
        return logData.username[0] + '以$' + logData.price + '的投資額獲得了' + logData.amount + '數量的公司股份。';
      }
      case '創立退款': {
        return '將$' + logData.amount + '的投資額退款回' + logData.username[0] + '。';
      }
      case '公司釋股': {
        return '以$' + logData.price + '的價格釋出了' + logData.amount + '數量的股票到市場上套取利潤。';
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

        return '由於' + logData.username[0] + '向' + (productData ? '產品「' + productData.productName + '」' : '一項產品') + '投了一張推薦票，獲得了$' + logData.price + '的營利額。';
      }
      case '支持紀錄': {
        return logData.username[0] + '開始支持' + logData.username[1] + '擔任經理人。';
      }
      case '就任經理': {
        let extraDescription = '';
        if (logData.username[1] === '!none') {
          extraDescription = '成為了公司的經理人。';
        }
        else if (logData.username[0] === logData.username[1]) {
          extraDescription = '繼續就任公司的經理人職務。';
        }
        else {
          extraDescription = '取代了' + logData.username[1] + '成為了公司的經理人。';
        }

        return (
          '在' + logData.message + '商業季度' +
          logData.username[0] +
          (logData.amount ? ('以' + logData.amount + '數量的支持股份') : '') +
          '擊敗了所有競爭對手，' + extraDescription
        );
      }
      case '公司營利': {
        return '在本季度的總營利額為$' + logData.amount + '。';
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
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfcompanyLog',
      dataNumberPerPage: 30,
      offset: rLogOffset
    };
  }
});
