'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
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
import { config } from '../../config';
import { alertDialog } from '../layout/alertDialog';

inheritedShowLoadingOnSubscribing(Template.company);
const rDirectorOffset = new ReactiveVar(0);
const rBuyOrderOffset = new ReactiveVar(0);
const rSellOrderOffset = new ReactiveVar(0);
const rLogOffset = new ReactiveVar(0);
Template.company.onCreated(function() {
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    if (Meteor.user()) {
      this.subscribe('queryMyOrder');
      this.subscribe('queryOwnStocks');
      const companyId = FlowRouter.getParam('companyId');
      if (companyId) {
        this.subscribe('queryMyLikeProduct', companyId);
      }
    }
  });
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyDetail', companyId);
      this.subscribe('companyCurrentProduct', companyId);
      this.subscribe('queryChairmanAsVariable', companyId);
      this.subscribe('productListByCompany', {
        companyId: companyId,
        sortBy: 'likeCount',
        sortDir: -1,
        offset: 0
      });
    }
  });
  this.autorun(() => {
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      const companyData = dbCompanies.findOne(companyId);
      if (companyData) {
        DocHead.setTitle(config.websiteName + ' - 「' + companyData.companyName + '」公司資訊');
      }
    }
  });
  rDirectorOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyDirector', companyId, rDirectorOffset.get());
    }
  });
  rBuyOrderOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyOrderExcludeMe', companyId, '購入', rBuyOrderOffset.get());
    }
  });
  rSellOrderOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyOrderExcludeMe', companyId, '賣出', rSellOrderOffset.get());
    }
  });
  rLogOffset.set(0);
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyLog', companyId, rLogOffset.get());
    }
  });
});

//定時呼叫取得今日交易量與股價走勢資料
const rTodayDealAmount = new ReactiveVar(0);
let lastQueryTodayDealAmountTime;
const rPriceList = new ReactiveVar([]);
let lastQueryStocksPriceTime;
Template.company.onCreated(function() {
  this.autorun(() => {
    FlowRouter.getParam('companyId');
    rTodayDealAmount.set(0);
    lastQueryTodayDealAmountTime = new Date().setHours(0, 0, 0, 0) - 1;
    rPriceList.set([]);
    lastQueryStocksPriceTime = new Date().setHours(0, 0, 0, 0) - 1;
  });
  queryDealAmountAndPrice();
  this.queryDealAmountAndPriceIntervalId = Meteor.setInterval(queryDealAmountAndPrice, 30000);
});
Template.company.onDestroyed(function() {
  Meteor.clearInterval(this.queryDealAmountAndPriceIntervalId);
});
function queryDealAmountAndPrice() {
  if (dbResourceLock.find('season').count()) {
    return false;
  }
  const companyId = FlowRouter.getParam('companyId');
  if (companyId) {
    Meteor.nativeCall('queryTodayDealAmount', companyId, lastQueryTodayDealAmountTime, (error, result) => {
      if (! error) {
        rTodayDealAmount.set(rTodayDealAmount.get() + result.data);
        lastQueryTodayDealAmountTime = result.lastTime;
      }
    });
    Meteor.nativeCall('queryStocksPrice', companyId, lastQueryStocksPriceTime, (error, result) => {
      if (! error) {
        if (result.list.length > 0) {
          rPriceList.set(rPriceList.get().concat(result.list));
        }
        lastQueryStocksPriceTime = result.lastTime;
      }
    });
  }
}

Template.company.helpers({
  companyData() {
    const companyId = FlowRouter.getParam('companyId');

    return dbCompanies.findOne(companyId);
  },
  getManageHref(companyId) {
    return FlowRouter.path('manageCompany', {companyId});
  }
});
Template.company.events({
  'click [data-action="changeChairmanTitle"]'() {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId);
    changeChairmanTitle(companyData);
  },
  'click [data-action="resignManager"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId);
    const companyName = companyData.companyName;
    const message = '你確定要辭去「' + companyName + '」的經理人職務？\n請輸入「' + companyName + '」以表示確定。';
    alertDialog.prompt(message, function(confirmMessage) {
      if (confirmMessage === companyName) {
        Meteor.call('resignManager', companyId);
      }
    });
  }
});

Template.companyDetail.onCreated(function() {
  this.rPicture = new ReactiveVar('');
  $.ajax({
    url: '/companyPicture',
    data: {
      id: this.data._id,
      type: 'big'
    },
    success: (response) => {
      this.rPicture.set(response);
    }
  });
});
Template.companyDetail.onRendered(function() {
  this.strChartType = 'trend';
  this.$chart = this.$('.chart');
  this.chart = null;
  this.autorun(() => {
    drawChart.apply(this);
  });
});
Template.companyDetail.helpers({
  getPicture() {
    const templateInstance = Template.instance();

    return templateInstance.rPicture.get();
  },
  priceDisplayClass(lastPrice, listPrice) {
    if (lastPrice > listPrice) {
      return 'text-danger';
    }
    else if (listPrice > lastPrice) {
      return 'text-success';
    }
  },
  getTodayDealAmount() {
    return rTodayDealAmount.get();
  }
});
Template.companyDetail.events({
  'click [data-chart-type]'(event) {
    event.preventDefault();
    $(event.currentTarget).blur();
    $('.company-detail .btn-group-vertical > .active').removeClass('active');
    $(event.currentTarget).addClass('active');
    const template = Template.instance();
    template.strChartType = $(event.currentTarget).attr('data-chart-type');
    drawChart.apply(template);
  }
});
function drawChart() {
  if (this.strChartType === 'trend') {
    drawLineChart.apply(this);
  }
  else {
    drawCandleStickChart.apply(this);
  }
}
function drawLineChart() {
  if (this.chart) {
    this.chart.destroy();
  }
  this.$chart
    .empty()
    .html('<canvas style="max-height:300px;"></canvas>');
  const ctx = this.$chart.find('canvas');
  const color = (localStorage.getItem('theme') === 'light') ? '#000000' : '#ffffff';
  this.chart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: '一日股價走勢',
          lineTension: 0,
          data: rPriceList.get(),
          borderColor: color,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      animation: {
        duration: 0
      },
      legend: {
        onClick: $.noop,
        labels: {
          fontColor: color
        }
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
              padding: 5,
              fontColor: color
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
              fontColor: color,
              beginAtZero: true,
              callback: function(value) {
                return '$' + Math.round(value);
              }
            }
          }
        ]
      }
    }
  });
}
function drawCandleStickChart() {
  this.$chart.empty();
  this.$chart.find('text').css('fill');

  const margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const width = this.$chart.width() - margin.right - margin.left;
  const height = 300 - margin.top - margin.bottom;
  const color = localStorage.theme === 'light' ? '#000' : '#fff';

  const svg = d3.select(this.$chart.get(0)).append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  const x = techan.scale.financetime().range([0, width]);
  const y = d3.scaleLinear().range([height, 0]);
  const candlestick = techan.plot.candlestick().xScale(x)
    .yScale(y);
  const xAxis = d3.axisBottom().scale(x);
  const yAxis = d3.axisLeft().scale(y);

  const count = 80;
  const unitTime = (this.strChartType === '5min' ? 300
    : this.strChartType === '10min' ? 600
      : this.strChartType === '30min' ? 1800
        : this.strChartType === '60min' ? 3600 : 86400) * 1000;
  const toTime = Math.floor(Date.now() / unitTime) * unitTime;

  const companyId = FlowRouter.getParam('companyId');
  Meteor.nativeCall('queryStocksCandlestick', companyId, { lastTime: toTime, unitTime: unitTime, count: count }, (error, result) => {
    const data = result.map(function(x) {
      return {
        date: new Date(x.time),
        open: x.open,
        close: x.close,
        high: x.high,
        low: x.low
      };
    });
    const accessor = candlestick.accessor();

    svg.append('g')
      .attr('class', 'candlestick');

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')');

    svg.append('g')
      .attr('class', 'y axis')
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 6)
      .attr('dy', '.71em')
      .style('text-anchor', 'end')
      .text('價格 ($)');

    x.domain(Array.from(new Array(count), (v, i) => {
      return new Date(toTime - unitTime * (count - i));
    }));
    y.domain(techan.scale.plot.ohlc(data, accessor).domain());

    svg.selectAll('g.candlestick').datum(data)
      .call(candlestick);
    svg.selectAll('g.x.axis').call(xAxis);
    svg.selectAll('g.y.axis').call(yAxis);
    svg.selectAll('line').style('stroke', color);
    svg.selectAll('path').style('stroke', color);
    svg.selectAll('text').style('fill', color);
    svg.selectAll('path.candle').style('stroke', color);
  });
}

Template.companyBuyOrderList.helpers({
  myOrderList() {
    const companyId = this._id;
    const user = Meteor.user();
    if (user) {
      const userId = user._id;

      return dbOrders.find(
        {
          companyId: companyId,
          orderType: '購入',
          userId: userId
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
    const companyId = this._id;
    const filter = {
      companyId: companyId,
      orderType:  '購入'
    };
    const user = Meteor.user();
    if (user) {
      filter.userId = {
        $ne: user._id
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
    return getStockAmount(this._id);
  },
  myOrderList() {
    const companyId = this._id;
    const user = Meteor.user();
    if (user) {
      const userId = user._id;

      return dbOrders.find(
        {
          companyId: companyId,
          orderType: '賣出',
          userId: userId
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
    const companyId = this._id;
    const filter = {
      companyId: companyId,
      orderType:  '賣出'
    };
    const user = Meteor.user();
    if (user) {
      filter.userId = {
        $ne: user._id
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

function getStockAmount(companyId) {
  const user = Meteor.user();
  if (user) {
    const userId = user._id;
    const ownStockData = dbDirectors.findOne({companyId, userId});

    return ownStockData ? ownStockData.stocks : 0;
  }
  else {
    return 0;
  }
}

Template.companyCurrentProductList.helpers({
  productList() {
    const companyId = this._id;
    const overdue = 1;

    return dbProducts.find({companyId, overdue}, {
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
      companyId: this._id
    });
  },
  productList() {
    const companyId = this._id;

    return dbProducts.find({companyId}, {
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
    const companyId = FlowRouter.getParam('companyId');
    likeProduct(productId, companyId);
  }
});

Template.companyDirectorList.helpers({
  directorList() {
    const companyId = this._id;

    return dbDirectors.find({companyId}, {
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
  getStockAmount(companyId) {
    return getStockAmount(companyId);
  },
  getMyMessage(companyId) {
    const userId = Meteor.user()._id;

    return dbDirectors.findOne({companyId, userId}).message;
  }
});
Template.companyDirectorList.events({
  'submit form'(event, templateInstance) {
    event.preventDefault();
    const message = templateInstance.$('[name="message"]').val();
    if (message.length > 100) {
      alertDialog.alert('輸入訊息過長！');
    }
    else if (Meteor.user() && message.length) {
      Meteor.call('directorMessage', templateInstance.data._id, message);
    }
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
      return ! _.contains(this.candidateList, user._id);
    }

    return false;
  },
  getSupportPercentage(candidateIndex) {
    const instanceData = Template.instance().data;
    const supportStocksList = instanceData.supportStocksList;
    const supportStocks = supportStocksList ? supportStocksList[candidateIndex] : 0;

    return Math.round(supportStocks / instanceData.totalRelease * 10000) / 100;
  },
  supportList(candidateIndex) {
    const instance = Template.instance();

    return instance.data.voteList[candidateIndex];
  },
  getStockAmount() {
    const instance = Template.instance();
    const instanceData = instance.data;

    return getStockAmount(instanceData._id);
  }
});
Template.companyElectInfo.events({
  'click [data-action="contendManager"]'(event, templateInstance) {
    event.preventDefault();
    const instanceData = templateInstance.data;
    const companyName = instanceData.companyName;
    alertDialog.confirm('你確定要參與競爭「' + companyName + '」的經理人職位嗎？', function(result) {
      if (result) {
        Meteor.call('contendManager', instanceData._id);
      }
    });
  },
  'click [data-support-candidate]'(event, templateInstance) {
    event.preventDefault();
    const instanceData = templateInstance.data;
    const candidateList = instanceData.candidateList;
    const candidateIndex = parseInt($(event.currentTarget).attr('data-support-candidate'), 10);
    const candidate = candidateList[candidateIndex];
    $.ajax({
      url: '/userName',
      data: {
        id: candidate
      },
      success: (userName) => {
        alertDialog.confirm('你確定要支持候選人「' + userName + '」嗎？', function(result) {
          if (result) {
            Meteor.call('supportCandidate', instanceData._id, candidate);
          }
        });
      }
    });
  }
});

Template.companyLogList.helpers({
  logList() {
    const companyId = FlowRouter.getParam('companyId');

    return dbLog.find({companyId}, {
      sort: {
        createdAt: -1
      },
      limit: rLogOffset.get() + 50
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfcompanyLog',
      dataNumberPerPage: 30,
      offset: rLogOffset
    };
  }
});
