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
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { createBuyOrder, createSellOrder, retrieveOrder, changeChairmanTitle, voteProduct, likeProduct, toggleFavorite } from '../utils/methods';
import { config } from '../../config';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';
const rShowAllTags = new ReactiveVar(false);

inheritedShowLoadingOnSubscribing(Template.companyDetail);
Template.companyDetail.onCreated(function() {
  rShowAllTags.set(false);
  this.autorun(() => {
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      const companyData = dbCompanies.findOne(companyId);
      if (companyData) {
        DocHead.setTitle(config.websiteName + ' - 「' + companyData.companyName + '」公司資訊');
      }
    }
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyDetail', companyId);
    }
  });
});
Template.companyDetail.helpers({
  companyData() {
    const companyId = FlowRouter.getParam('companyId');

    return dbCompanies.findOne(companyId);
  },
  getManageHref(companyId) {
    return FlowRouter.path('editCompany', {companyId});
  },
  showAllTags(tags) {
    if (tags && tags.length <= 4) {
      return true;
    }

    return rShowAllTags.get();
  },
  firstFewTags(tags) {
    return tags && tags.slice(0, 3);
  },
  haveNextSeasonProduct() {
    const companyId = this._id;
    const overdue = 0;
    window.dbProducts = dbProducts;

    return dbProducts.find({companyId, overdue}).count() > 0;
  }
});
Template.companyDetail.events({
  'click [data-action="changeCompanyName"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        companyName: 1
      }
    });
    alertDialog.dialog({
      type: 'prompt',
      title: '公司更名',
      message: `請輸入新的公司名稱：`,
      defaultValue: companyData.companyName,
      callback: function(companyName) {
        if (companyName) {
          Meteor.customCall('changeCompanyName', companyId, companyName);
        }
      }
    });
  },
  'click [data-action="seal"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        companyName: 1,
        isSeal: 1
      }
    });
    const companyName = companyData.companyName;
    const title = (companyData.isSeal ? '解除查封 - ' : '查封關停 - ') + companyName;
    alertDialog.dialog({
      type: 'prompt',
      title: title,
      message: `請輸入處理事由：`,
      callback: function(message) {
        if (message) {
          Meteor.customCall('sealCompany', {companyId, message});
        }
      }
    });
  },
  'click [data-action="showAllTags"]'(event) {
    event.preventDefault();
    rShowAllTags.set(true);
  },
  'click [data-toggle-favorite]'(event) {
    event.preventDefault();
    const companyId = $(event.currentTarget).attr('data-toggle-favorite');
    toggleFavorite(companyId);
  },
  'click [data-action="changeChairmanTitle"]'(event) {
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
        Meteor.customCall('resignManager', companyId);
      }
    });
  }
});

//是否展開面板
const rDisplayPanelList = new ReactiveVar([]);
Template.companyDetailTable.helpers({
  isDisplayPanel(panelType) {
    return _.contains(rDisplayPanelList.get(), panelType);
  },
  priceDisplayClass(lastPrice, listPrice) {
    if (lastPrice > listPrice) {
      return 'text-danger';
    }
    else if (listPrice > lastPrice) {
      return 'text-success';
    }
  }
});
Template.companyDetailTable.events({
  'click [data-toggle-panel]'(event) {
    event.preventDefault();
    const $emitter = $(event.currentTarget);
    const panelType = $emitter.attr('data-toggle-panel');
    const displayPanelList = rDisplayPanelList.get();
    if (_.contains(displayPanelList, panelType)) {
      rDisplayPanelList.set(_.without(displayPanelList, panelType));
    }
    else {
      displayPanelList.push(panelType);
      rDisplayPanelList.set(displayPanelList);
    }
  }
});

Template.companyChart.onRendered(function() {
  this.strChartType = 'trend';
  this.$chart = this.$('.chart');
  this.chart = null;
  this.autorun(() => {
    drawChart(this);
  });
});
Template.companyChart.events({
  'click [data-chart-type]'(event, templateInstance) {
    event.preventDefault();
    $(event.currentTarget).blur();
    $('.company-detail .btn-group-vertical > .active').removeClass('active');
    $(event.currentTarget).addClass('active');
    templateInstance.strChartType = $(event.currentTarget).attr('data-chart-type');
    drawChart(templateInstance);
  }
});
function drawChart(templateInstance) {
  if (templateInstance.strChartType === 'trend') {
    drawLineChart(templateInstance);
  }
  else {
    drawCandleStickChart(templateInstance);
  }
}
function drawLineChart(templateInstance) {
  if (! Meteor.status().connected) {
    return false;
  }
  if (templateInstance.chart) {
    templateInstance.chart.destroy();
  }
  const companyId = FlowRouter.getParam('companyId');
  Meteor.call('queryStocksPrice', companyId, (error, result) => {
    if (error) {
      return false;
    }
    if (! result.length) {
      return false;
    }
    templateInstance.$chart
      .empty()
      .html('<canvas style="max-height:300px;"></canvas>');
    const ctx = templateInstance.$chart.find('canvas');
    const color = (localStorage.getItem('theme') === 'light') ? '#000000' : '#ffffff';
    templateInstance.chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: '一日股價走勢',
            lineTension: 0,
            data: _.sortBy(result, 'x'),
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
  });
}
function drawCandleStickChart(templateInstance) {
  if (! Meteor.status().connected) {
    return false;
  }
  if (templateInstance.chart) {
    templateInstance.chart.destroy();
  }
  templateInstance.$chart.empty();
  templateInstance.$chart.find('text').css('fill');

  const margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const width = templateInstance.$chart.width() - margin.right - margin.left;
  const height = 300 - margin.top - margin.bottom;
  const color = localStorage.theme === 'light' ? '#000' : '#fff';

  const svg = d3.select(templateInstance.$chart.get(0)).append('svg')
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
  const unitTime = (templateInstance.strChartType === '5min' ? 300
    : templateInstance.strChartType === '10min' ? 600
      : templateInstance.strChartType === '30min' ? 1800
        : templateInstance.strChartType === '60min' ? 3600 : 86400) * 1000;
  const toTime = Math.floor(Date.now() / unitTime) * unitTime;

  const companyId = FlowRouter.getParam('companyId');
  Meteor.call('queryStocksCandlestick', companyId, { lastTime: toTime, unitTime: unitTime, count: count }, (error, result) => {
    if (error) {
      return false;
    }
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
    const grid = svg.append('g').attr('class', 'grid');
    const content = svg.append('g').attr('class', 'content');

    content.append('g')
      .attr('class', 'candlestick');

    content.append('g')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + height + ')');

    content.append('g')
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

    grid.call(d3.axisLeft().scale(y)
      .tickSize(-width)
      .tickFormat(''));

    svg.selectAll('g.candlestick').datum(data)
      .call(candlestick);
    svg.selectAll('g.x.axis').call(xAxis);
    svg.selectAll('g.y.axis').call(yAxis);
    svg.select('.content').selectAll('line')
      .style('stroke', color);
    svg.select('.content').selectAll('path')
      .style('stroke', color);
    svg.selectAll('text').style('fill', color);
    svg.selectAll('path.candle').style('stroke', color);
  });
}

//定時呼叫取得今日交易量資料
const rTodayDealAmount = new ReactiveVar(0);
Template.companyTodayDealAmount.onCreated(function() {
  if (! Meteor.status().connected) {
    return false;
  }
  const companyId = FlowRouter.getParam('companyId');
  if (companyId) {
    Meteor.call('queryTodayDealAmount', companyId, (error, result) => {
      if (! error) {
        rTodayDealAmount.set(result);
      }
    });
  }
});
Template.companyTodayDealAmount.helpers({
  getTodayDealAmount() {
    return rTodayDealAmount.get();
  }
});

const rBuyOrderOffset = new ReactiveVar(0);
const rSellOrderOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.companyBuyOrderList);
Template.companyBuyOrderList.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    if (Meteor.user()) {
      this.subscribe('queryMyOrder');
      this.subscribe('queryOwnStocks');
    }
  });
  rBuyOrderOffset.set(0);
  rSellOrderOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyOrderExcludeMe', companyId, '購入', rBuyOrderOffset.get());
      this.subscribe('companyOrderExcludeMe', companyId, '賣出', rSellOrderOffset.get());
    }
  });
});
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
            unitPrice: -1,
            createdAt: 1
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
            unitPrice: 1,
            createdAt: 1
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

inheritedShowLoadingOnSubscribing(Template.companyCurrentProductList);
Template.companyCurrentProductList.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    if (Meteor.user()) {
      const companyId = FlowRouter.getParam('companyId');
      if (companyId) {
        this.subscribe('queryMyLikeProduct', companyId);
      }
    }
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyCurrentProduct', companyId);
      this.subscribe('productListByCompany', {
        companyId: companyId,
        sortBy: 'likeCount',
        sortDir: -1,
        offset: 0
      });
    }
  });
});
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
  'click [data-vote-product]'(event, templateInstance) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-vote-product');
    const companyId = templateInstance.data._id;
    voteProduct(productId, companyId);
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

    return dbProducts.find(
      {
        companyId: companyId,
        overdue: {
          $gt: 0
        }
      },
      {
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
    likeProduct(productId);
  }
});

const rDirectorOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.companyDirectorList);
Template.companyDirectorList.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    if (Meteor.user()) {
      this.subscribe('queryOwnStocks');
    }
  });
  rDirectorOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyDirector', companyId, rDirectorOffset.get());
    }
  });
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
      Meteor.customCall('directorMessage', templateInstance.data._id, message);
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
        Meteor.customCall('contendManager', instanceData._id);
      }
    });
  },
  'click [data-support-candidate]'(event, templateInstance) {
    event.preventDefault();
    const user = Meteor.user();
    if (! user) {
      return false;
    }
    const instanceData = templateInstance.data;
    const candidateList = instanceData.candidateList;
    const candidateIndex = parseInt($(event.currentTarget).attr('data-support-candidate'), 10);
    const candidate = candidateList[candidateIndex];
    const supportList = instanceData.voteList[candidateIndex];
    $.ajax({
      url: '/userName',
      data: {
        id: candidate
      },
      success: (userName) => {
        if (_.contains(supportList, user._id)) {
          alertDialog.alert('你已經正在支持使用者' + userName + '了，無法再次進行支持！');
        }
        else {
          alertDialog.confirm('你確定要支持候選人「' + userName + '」嗎？', function(result) {
            if (result) {
              Meteor.customCall('supportCandidate', instanceData._id, candidate);
            }
          });
        }
      }
    });
  }
});

//取得當前使用者持有指定公司的股份數量
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

const rLogOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.companyLogList);
Template.companyLogList.onCreated(function() {
  rLogOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyLog', companyId, rLogOffset.get());
    }
  });
});
Template.companyLogList.helpers({
  logList() {
    const companyId = FlowRouter.getParam('companyId');

    return dbLog.find({companyId}, {
      sort: {
        createdAt: -1
      },
      limit: 30
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
