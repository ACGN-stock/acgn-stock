'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbArena } from '/db/dbArena';
import { dbArenaFighters, getAttributeNumber } from '/db/dbArenaFighters';
import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbEmployees } from '/db/dbEmployees';
import { dbLog } from '/db/dbLog';
import { dbOrders } from '/db/dbOrders';
import { dbProducts } from '/db/dbProducts';
import { dbSeason } from '/db/dbSeason';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { createBuyOrder, createSellOrder, retrieveOrder, changeChairmanTitle, voteProduct, likeProduct, toggleFavorite } from '../utils/methods';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';
import { currencyFormat } from '../utils/helpers.js';
import { inheritUtilForm, handleInputChange as inheritedHandleInputChange } from '../utils/form';
const rShowAllTags = new ReactiveVar(false);

inheritedShowLoadingOnSubscribing(Template.companyDetail);
Template.companyDetail.onCreated(function() {
  rShowAllTags.set(false);
  this.autorun(() => {
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      const companyData = dbCompanies.findOne(companyId);
      if (companyData) {
        DocHead.setTitle(Meteor.settings.public.websiteName + ' - 「' + companyData.companyName + '」公司資訊');
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
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('employeeListByCompany', companyId);
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
  },
  canUpdateSalary() {
    const seasonData = dbSeason
      .findOne({}, {
        sort: {
          beginDate: -1
        }
      });
    if (! seasonData) {
      return false;
    }

    return Date.now() < seasonData.endDate.getTime() - Meteor.settings.public.announceSalaryTime;
  },
  canUpdateSeasonalBonus() {
    const seasonData = dbSeason
      .findOne({}, {
        sort: {
          beginDate: -1
        }
      });
    if (! seasonData) {
      return false;
    }

    return Date.now() < seasonData.endDate.getTime() - Meteor.settings.public.announceBonusTime;
  },
  isEmployee() {
    const userId = Meteor.userId();
    const companyId = FlowRouter.getParam('companyId');
    const employed = false;
    const resigned = false;

    return dbEmployees.find({companyId, userId, employed, resigned}).count() > 0;
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
  'click [data-action="fscAnnouncement"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        companyName: 1,
        manager: 1
      }
    });

    alertDialog.dialog({
      type: 'prompt',
      title: '金管會通告 - 輸入通知訊息',
      message: `請輸入要通告的訊息：`,
      callback: function(message) {
        if (message) {
          const userIds = [companyData.manager];
          Meteor.customCall('fscAnnouncement', { userIds, companyId, message });
        }
      }
    });
  },
  'click [data-action="accuseCompany"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId, { fields: { companyName: 1 } });
    alertDialog.dialog({
      type: 'prompt',
      title: `舉報違規 - 「${companyData.companyName}」公司`,
      message: `請輸入您要舉報的內容：`,
      callback: function(message) {
        if (message) {
          Meteor.customCall('accuseCompany', companyId, message);
        }
      }
    });
  },
  'click [data-action="showAllTags"]'(event) {
    event.preventDefault();
    rShowAllTags.set(true);
  },
  'click [data-toggle-employ]'(event) {
    event.preventDefault();
    const userId = Meteor.userId();
    const companyId = $(event.currentTarget).attr('data-toggle-employ');
    const employed = false;
    const resigned = false;
    const employData = dbEmployees.findOne({companyId, userId, employed, resigned});
    if (employData) {
      Meteor.customCall('unregisterEmployee', function(err) {
        if (! err) {
          alertDialog.alert('您已取消報名！');
        }
      });
    }
    else {
      const message = '報名後將會被其他公司移出儲備員工名單，您確定要報名嗎？';
      alertDialog.confirm(message, (result) => {
        if (result) {
          Meteor.customCall('registerEmployee', companyId, function(err) {
            if (! err) {
              alertDialog.alert('您已報名成功！');
            }
          });
        }
      });
    }
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
  'click [data-action="updateSalary"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const message = '請輸入下季員工薪資：(' +
      currencyFormat(Meteor.settings.public.minimumCompanySalaryPerDay) + '~' +
      currencyFormat(Meteor.settings.public.maximumCompanySalaryPerDay) + ')';
    alertDialog.prompt(message, function(salary) {
      if (salary && salary.length > 0) {
        salary = parseInt(salary, 10);
        if (isNaN(salary) ||
          salary < Meteor.settings.public.minimumCompanySalaryPerDay ||
          salary > Meteor.settings.public.maximumCompanySalaryPerDay) {
          alertDialog.alert('不正確的薪資設定！');

          return false;
        }

        Meteor.customCall('updateNextSeasonSalary', companyId, salary);
      }
    });
  },
  'click [data-action="updateSeasonalBonus"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const message = '請輸入本季員工分紅占營收百分比：(' +
      Meteor.settings.public.minimumSeasonalBonusPercent + '~' +
      Meteor.settings.public.maximumSeasonalBonusPercent + ')';
    alertDialog.prompt(message, function(percentage) {
      if (percentage && percentage.length > 0) {
        percentage = parseInt(percentage, 10);
        if (isNaN(percentage) ||
          percentage < Meteor.settings.public.minimumSeasonalBonusPercent ||
          percentage > Meteor.settings.public.maximumSeasonalBonusPercent) {
          alertDialog.alert('不正確的分紅設定！');

          return false;
        }

        Meteor.customCall('updateSeasonalBonus', companyId, percentage);
      }
    });
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
                  return '$' + Math.round(value).toLocaleString();
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
  const unitTime = (templateInstance.strChartType === '30min' ? 1800
    : templateInstance.strChartType === '60min' ? 3600
      : templateInstance.strChartType === '4hr' ? 14400
        : templateInstance.strChartType === '12hr' ? 43200 : 86400) * 1000;
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
        },
        limit: 10
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
  },
  isDirectorInVacation(userId) {
    const user = Meteor.users.findOne(userId);

    return user ? user.profile.isInVacation : false;
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
      url: '/userInfo',
      data: {
        id: candidate
      },
      dataType: 'json',
      success: (userData) => {
        const userName = userData.name;
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

inheritedShowLoadingOnSubscribing(Template.companyEmployeeList);
Template.companyEmployeeList.helpers({
  employeeList() {
    const companyId = FlowRouter.getParam('companyId');
    const employed = true;

    return dbEmployees.find({companyId, employed}, {
      sort: {
        registerAt: 1
      }
    });
  },
  nextSeasonEmployeeList() {
    const companyId = FlowRouter.getParam('companyId');
    const employed = false;

    return dbEmployees.find({companyId, employed}, {
      sort: {
        registerAt: 1
      }
    });
  },
  isCurrentUserEmployed() {
    const userId = Meteor.userId();
    const companyId = FlowRouter.getParam('companyId');

    if (! userId) {
      return false;
    }

    return dbEmployees.find({ companyId, userId, employed: true }).count() > 0;
  },
  showMessage(message) {
    return message || '無';
  },
  getMyMessage() {
    const userId = Meteor.userId();
    const companyId = FlowRouter.getParam('companyId');

    const employeeData = dbEmployees.findOne({ companyId, userId, employed: true });
    if (! employeeData) {
      return '';
    }

    return employeeData.message;
  }
});
Template.companyEmployeeList.events({
  'submit form'(event, templateInstance) {
    event.preventDefault();
    const message = templateInstance.$('[name="message"]').val();
    if (message.length > 100) {
      alertDialog.alert('輸入訊息過長！');
    }
    else if (Meteor.user() && message.length) {
      Meteor.customCall('setEmployeeMessage', templateInstance.data._id, message);
    }
  }
});

inheritedShowLoadingOnSubscribing(Template.companyArenaInfo);
Template.companyArenaInfo.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyArenaInfo', companyId);
    }
  });
});
Template.companyArenaInfo.helpers({
  currentArenaLinkHref() {
    const arenaData = dbArena.findOne({}, {
      sort: {
        beginDate: -1
      }
    });
    const arenaId = arenaData._id;

    return FlowRouter.path('arenaInfo', {arenaId});
  },
  currentArenaData() {
    const arenaData = dbArena.findOne({}, {
      sort: {
        beginDate: -1
      }
    });
    if (arenaData) {
      arenaData.companyData = this;
      arenaData.joinData = dbArenaFighters.findOne({
        arenaId: arenaData._id,
        companyId: this._id
      });

      return arenaData;
    }
    else {
      return false;
    }
  },
  getAttributeNumber(attribute, number) {
    return getAttributeNumber(attribute, number);
  },
  inCanJoinTime() {
    return Date.now() < this.joinEndDate.getTime();
  }
});
Template.companyArenaInfo.events({
  'click [data-action="joinArena"]'(event, templateInstance) {
    const {_id, companyName} = templateInstance.data;
    const message = '你確定要讓「' + companyName + '」報名這一屆的最萌亂鬥大賽嗎？\n報名後將無法取消，請輸入「' + companyName + '」以表示確定。';
    alertDialog.prompt(message, function(confirmMessage) {
      if (confirmMessage === companyName) {
        Meteor.customCall('joinArena', _id);
      }
    });
  },
  'click [data-invest]'(event, templateInstance) {
    event.preventDefault();
    const {_id, companyName} = templateInstance.data;
    const investTarget = $(event.currentTarget).attr('data-invest');
    const user = Meteor.user();
    if (! user) {
      alertDialog.alert('您尚未登入！');

      return false;
    }
    const minimumUnitPrice = 1;
    const maximumUnitPrice = user.profile.money;
    const message = (
      '請輸入要您要投資在「' + companyName + '」' +
      '的屬性「' + investTarget.toUpperCase() + '」的金錢：' +
      `(${currencyFormat(minimumUnitPrice)}~${currencyFormat(maximumUnitPrice)})`
    );
    alertDialog.prompt(message, function(investMoney) {
      const intInvestMoney = parseInt(investMoney, 10);
      if (! intInvestMoney) {
        return false;
      }
      if (intInvestMoney < minimumUnitPrice || intInvestMoney > maximumUnitPrice) {
        alertDialog.alert('不正確的金額設定！');

        return false;
      }
      Meteor.customCall('investArenaFigher', _id, investTarget, intInvestMoney);
    });
  }
});

inheritUtilForm(Template.arenaStrategyForm);
Template.arenaStrategyForm.onCreated(function() {
  this.validateModel = validateStrategyModel;
  this.handleInputChange = handleStrategyInputChange;
  this.saveModel = saveStrategyModel;
  this.model.set(this.data.joinData);
  this.draggingIndex = null;
});
Template.arenaStrategyForm.onRendered(function() {
  this.model.set(this.data.joinData);
});
function validateStrategyModel(model) {
  const error = {};
  if (model.spCost > getAttributeNumber('sp', model.sp)) {
    error.spCost = '特攻消耗數值不可超過角色的SP值！';
  }
  else if (model.spCost < 1) {
    error.spCost = '特攻消耗數值不可低於1！';
  }
  else if (model.spCost > 10) {
    error.spCost = '特攻消耗數值不可高於10！';
  }

  if (_.size(error) > 0) {
    return error;
  }
}
function handleStrategyInputChange(event) {
  switch (event.currentTarget.name) {
    case 'spCost': {
      const model = this.model.get();
      model.spCost = parseInt(event.currentTarget.value, 10);
      this.model.set(model);
      break;
    }
    case 'normalManner': {
      const model = this.model.get();
      model.normalManner = this.$input
        .filter('[name="normalManner"]')
        .map((index, input) => {
          return input.value;
        })
        .toArray();
      this.model.set(model);
      break;
    }
    case 'specialManner': {
      const model = this.model.get();
      model.specialManner = this.$input
        .filter('[name="specialManner"]')
        .map((index, input) => {
          return input.value;
        })
        .toArray();
      this.model.set(model);
      break;
    }
    default: {
      inheritedHandleInputChange.call(this, event);
      break;
    }
  }
}
function saveStrategyModel(model) {
  const submitData = _.pick(model, 'spCost', 'attackSequence', 'normalManner', 'specialManner');
  Meteor.customCall('decideArenaStrategy', model.companyId, submitData, (error) => {
    if (! error) {
      alertDialog.alert('決策完成！');
    }
  });
}
Template.arenaStrategyForm.helpers({
  getManner(type, index) {
    const model = Template.instance().model.get();
    const fieldName = type + 'Manner';

    return model[fieldName][index];
  },
  hasEnemy() {
    return this.fighterSequence.length > 0;
  },
  enemyList() {
    const fighterSequence = this.fighterSequence;
    const model = Template.instance().model.get();

    return _.map(model.attackSequence, (attackIndex) => {
      return fighterSequence[attackIndex];
    });
  }
});
Template.arenaStrategyForm.events({
  'dragstart [data-drag]'(event, templateInstance) {
    templateInstance.draggingIndex = parseInt($(event.currentTarget).attr('data-drag'), 10);
  },
  'dragover [data-drag]'(event, templateInstance) {
    const draggingIndex = templateInstance.draggingIndex;
    const selfDraggingIndex = parseInt($(event.currentTarget).attr('data-drag'), 10);
    if (draggingIndex !== null && draggingIndex !== selfDraggingIndex) {
      event.preventDefault();
    }
  },
  'dragend [data-drag]'(event, templateInstance) {
    templateInstance.draggingIndex = null;
  },
  'drop [data-drag]'(event, templateInstance) {
    const draggingIndex = templateInstance.draggingIndex;
    if (draggingIndex !== null) {
      const model = templateInstance.model.get();
      const attackSequence = model.attackSequence;
      const draggingItem = attackSequence[draggingIndex];
      const dropIndex = parseInt($(event.currentTarget).attr('data-drag'), 10);
      const dropItem = attackSequence[dropIndex];
      attackSequence[dropIndex] = draggingItem;
      attackSequence[draggingIndex] = dropItem;
      templateInstance.model.set(model);
    }
  }
});

const rIsOnlyShowMine = new ReactiveVar(false);
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
      this.subscribe('companyLog', companyId, rIsOnlyShowMine.get(), rLogOffset.get());
    }
  });
});
Template.companyLogList.helpers({
  onlyShowMine() {
    return rIsOnlyShowMine.get();
  },
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
Template.companyLogList.events({
  'click button'(event) {
    event.preventDefault();
    rIsOnlyShowMine.set(! rIsOnlyShowMine.get());
  }
});
