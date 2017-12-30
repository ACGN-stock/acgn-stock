'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { DocHead } from 'meteor/kadira:dochead';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbArena } from '/db/dbArena';
import { dbArenaFighters, getAttributeNumber, getTotalInvestedAmount } from '/db/dbArenaFighters';
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
});
Template.companyDetail.helpers({
  companyData() {
    const companyId = FlowRouter.getParam('companyId');

    return dbCompanies.findOne(companyId);
  }
});

Template.companyDetailContentNormal.onCreated(function() {
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
Template.companyDetailContentNormal.helpers({
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
Template.companyDetailContentNormal.events({
  'click [data-action="accuseCompany"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId, { fields: { companyName: 1 } });
    alertDialog.dialog({
      type: 'prompt',
      title: `舉報違規 - 「${companyData.companyName}」公司`,
      message: `請輸入您要舉報的內容：`,
      callback: (message) => {
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
      alertDialog.confirm({
        message,
        callback: (result) => {
          if (result) {
            Meteor.customCall('registerEmployee', companyId, function(err) {
              if (! err) {
                alertDialog.alert('您已報名成功！');
              }
            });
          }
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
    const minSalary = Meteor.settings.public.minimumCompanySalaryPerDay;
    const maxSalary = Meteor.settings.public.maximumCompanySalaryPerDay;
    const message = `請輸入下季員工薪資：(${currencyFormat(minSalary)}~${currencyFormat(maxSalary)})`;

    alertDialog.prompt({
      message,
      inputType: 'number',
      customSetting: `min="${minSalary}" max="${maxSalary}"`,
      callback: (salary) => {
        if (salary && salary.length > 0) {
          salary = parseInt(salary, 10);
          if (isNaN(salary) || salary < minSalary || salary > maxSalary) {
            alertDialog.alert('不正確的薪資設定！');

            return false;
          }

          Meteor.customCall('updateNextSeasonSalary', companyId, salary);
        }
      }
    });
  },
  'click [data-action="updateSeasonalBonus"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const minBonus = Meteor.settings.public.minimumSeasonalBonusPercent;
    const maxBonus = Meteor.settings.public.maximumSeasonalBonusPercent;
    const message = `請輸入本季員工分紅占營收百分比：(${minBonus}~${maxBonus})`;

    alertDialog.prompt({
      message,
      inputType: 'number',
      customSetting: `min="${minBonus}" max="${maxBonus}"`,
      callback: (percentage) => {
        if (percentage && percentage.length > 0) {
          percentage = parseInt(percentage, 10);
          if (isNaN(percentage) || percentage < minBonus || percentage > maxBonus) {
            alertDialog.alert('不正確的分紅設定！');

            return false;
          }

          Meteor.customCall('updateSeasonalBonus', companyId, percentage);
        }
      }
    });
  },
  'click [data-action="resignManager"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId);
    const companyName = companyData.companyName;
    const checkCompanyName = companyName.replace(/\s/g, '');
    const message = '你確定要辭去「' + companyName + '」的經理人職務？\n請輸入「' + checkCompanyName + '」以表示確定。';

    alertDialog.prompt({
      message,
      callback: (confirmMessage) => {
        if (confirmMessage === checkCompanyName) {
          Meteor.customCall('resignManager', companyId);
        }
      }
    });
  },
  'click [data-action="markCompanyIllegal"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        companyName: 1
      }
    });
    alertDialog.dialog({
      type: 'prompt',
      title: '設定違規標記',
      message: '請輸入違規事由：',
      defaultValue: companyData.illegalReason,
      callback: (reason) => {
        if (! reason) {
          return;
        }
        if (reason.length > 10) {
          alertDialog.alert('違規標記事由不可大於十個字！');

          return;
        }

        Meteor.customCall('markCompanyIllegal', companyId, reason);
      }
    });
  },
  'click [data-action="unmarkCompanyIllegal"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    alertDialog.confirm({
      message: '是否解除違規標記？',
      callback: (result) => {
        if (result) {
          Meteor.customCall('unmarkCompanyIllegal', companyId);
        }
      }
    });
  },
  'click [data-action="forfeitCompanyProfit"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId);

    const dialogTitle = `課以罰金 - 「${companyData.companyName}」公司`;

    alertDialog.dialog({
      type: 'prompt',
      title: dialogTitle,
      message: '請輸入處理事由：',
      callback: (reason) => {
        if (reason) {
          alertDialog.dialog({
            type: 'prompt',
            title: dialogTitle,
            message: '請輸入罰金數額：',
            inputType: 'number',
            customSetting: 'min="0"',
            callback: (amount) => {
              amount = parseInt(amount, 10);
              if (amount && amount >= 0) {
                Meteor.customCall('forfeitCompanyProfit', { companyId, reason, amount });
              }
            }
          });
        }
      }
    });
  },
  'click [data-action="returnForfeitedCompanyProfit"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const { companyName } = dbCompanies.findOne(companyId);

    const dialogTitle = `退還罰金 - 「${companyName}」公司`;

    alertDialog.dialog({
      type: 'prompt',
      title: dialogTitle,
      message: `請輸入處理事由：`,
      callback: (reason) => {
        if (reason) {
          alertDialog.dialog({
            type: 'prompt',
            title: dialogTitle,
            message: `請輸入退還金額：`,
            inputType: 'number',
            customSetting: `min="0"`,
            callback: (amount) => {
              amount = parseInt(amount, 10);
              if (amount && amount > 0) {
                Meteor.customCall('forfeitCompanyProfit', { companyId, reason, amount: -amount });
              }
            }
          });
        }
      }
    });
  }
});

Template.companyDetailContentSealed.events({
  'click [data-action="unseal"]'(event) {
    event.preventDefault();
    const companyId = FlowRouter.getParam('companyId');
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        companyName: 1,
        isSeal: 1
      }
    });
    const companyName = companyData.companyName;
    const title = '解除查封 - ' + companyName;
    alertDialog.dialog({
      type: 'prompt',
      title: title,
      message: `請輸入處理事由：`,
      callback: (message) => {
        if (message) {
          Meteor.customCall('sealCompany', {companyId, message});
        }
      }
    });
  }
});

Template.companyDetailAdminPanel.events({
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
      callback: (companyName) => {
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
      callback: (message) => {
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
      callback: (message) => {
        if (message) {
          const userIds = [companyData.manager];
          Meteor.customCall('fscAnnouncement', { userIds, companyId, message });
        }
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
    const chartType = $(event.currentTarget).attr('data-chart-type');
    $('.company-detail .company-chart-btn-group > .active').removeClass('active');
    $('.company-detail .company-chart-btn-group')
      .find('[data-chart-type="' + chartType + '"]')
      .addClass('active');
    templateInstance.strChartType = chartType;
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
      .html('<canvas style="height:300px;"></canvas>');
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
        maintainAspectRatio: false,
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
              },
              afterBuildTicks(axis) {
                axis.ticks = _.uniq(
                  axis.ticks.map((n) => {
                    return Math.round(n);
                  })
                );
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

  const margin = { top: 20, right: 10, bottom: 30, left: 45 };
  const width = Math.max(templateInstance.$chart.width() - margin.right - margin.left, 450);
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
      .attr('y', -6)
      .style('text-anchor', 'end')
      .text('價格 ($)');

    x.domain(Array.from(new Array(count), (v, i) => {
      return new Date(toTime - unitTime * (count - i));
    }));

    let yDomain = techan.scale.plot.ohlc(data, accessor).domain();
    y.domain(techan.scale.plot.ohlc(data, accessor).domain());

    // 自訂y軸，避免小數情況出現
    yDomain = yDomain.map((n) => {
      return Math.round(n);
    }).sort((a, b) => {
      return (a - b);
    });

    const yDomainMin = _.first(yDomain);
    const yDomainMax = _.last(yDomain);
    const yTickMaxCount = 10;
    const yTickStep = Math.max(Math.floor((yDomainMax - yDomainMin) / yTickMaxCount), 1);

    const yTickValues = Array.from(new Array(yTickMaxCount + 1), (v, i) => {
      return yDomainMax - yTickStep * i;
    }).filter((n) => {
      return n >= yDomainMin;
    });

    const yAxis = d3.axisLeft().scale(y)
      .tickValues(yTickValues)
      .tickFormat(d3.format('d'));

    grid.call(d3.axisLeft().scale(y)
      .tickSize(-width)
      .ticks(yTickValues.length)
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
const rShowSupporterList = new ReactiveVar(null);
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
  },
  showSupportListDialog() {
    return rShowSupporterList.get() !== null;
  }
});
Template.companyElectInfo.events({
  'click [data-action="contendManager"]'(event, templateInstance) {
    event.preventDefault();
    const instanceData = templateInstance.data;
    const companyName = instanceData.companyName;
    alertDialog.confirm({
      message: '你確定要參與競爭「' + companyName + '」的經理人職位嗎？',
      callback: (result) => {
        if (result) {
          Meteor.customCall('contendManager', instanceData._id);
        }
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
          alertDialog.confirm({
            message: '你確定要支持候選人「' + userName + '」嗎？',
            callback: (result) => {
              if (result) {
                Meteor.customCall('supportCandidate', instanceData._id, candidate);
              }
            }
          });
        }
      }
    });
  },
  'click [data-show-supporter]'(event, templateInstance) {
    event.preventDefault();
    const instanceData = templateInstance.data;
    const candidateIndex = parseInt($(event.currentTarget).attr('data-show-supporter'), 10);
    const option = {
      candidateId: instanceData.candidateList[candidateIndex],
      voteList: instanceData.voteList[candidateIndex]
    };

    rShowSupporterList.set(option);
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

Template.supporterListDialog.helpers({
  candidateId() {
    return rShowSupporterList.get().candidateId;
  },
  supporters() {
    return rShowSupporterList.get().voteList;
  }
});

Template.supporterListDialog.events({
  'click .btn'(event) {
    event.preventDefault();
    rShowSupporterList.set(null);
  }
});

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
  },
  totalInvestedAmount() {
    return getTotalInvestedAmount(this);
  },
  arenaMinInvestedAmount() {
    return Meteor.settings.public.arenaMinInvestedAmount;
  },
  notEnoughInvestedAmount() {
    return getTotalInvestedAmount(this) < Meteor.settings.public.arenaMinInvestedAmount;
  }
});
Template.companyArenaInfo.events({
  'click [data-action="joinArena"]'(event, templateInstance) {
    const {_id, companyName} = templateInstance.data;
    const checkCompanyName = companyName.replace(/\s/g, '');
    const message = '你確定要讓「' +
      companyName +
      '」報名這一屆的最萌亂鬥大賽嗎？\n報名後將無法取消，請輸入「' +
      checkCompanyName +
      '」以表示確定。';

    alertDialog.prompt({
      message,
      callback: (confirmMessage) => {
        if (confirmMessage === checkCompanyName) {
          Meteor.customCall('joinArena', _id);
        }
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
    if (maximumUnitPrice < minimumUnitPrice) {
      alertDialog.alert('您的金錢不足以投資！');

      return false;
    }
    const message = (
      '請輸入要您要投資在「' + companyName + '」' +
      '的屬性「' + investTarget.toUpperCase() + '」的金錢：' +
      `(${currencyFormat(minimumUnitPrice)}~${currencyFormat(maximumUnitPrice)})`
    );

    alertDialog.prompt({
      message,
      inputType: 'number',
      customSetting: `min="${minimumUnitPrice}" max="${maximumUnitPrice}"`,
      callback: (investMoney) => {
        const intInvestMoney = parseInt(investMoney, 10);
        if (! intInvestMoney) {
          return false;
        }
        if (intInvestMoney < minimumUnitPrice || intInvestMoney > maximumUnitPrice) {
          alertDialog.alert('不正確的金額設定！');

          return false;
        }
        Meteor.customCall('investArenaFigher', _id, investTarget, intInvestMoney);
      }
    });
  }
});

inheritUtilForm(Template.arenaStrategyForm);
const rSortedAttackSequence = new ReactiveVar([]);
Template.arenaStrategyForm.onCreated(function() {
  this.validateModel = validateStrategyModel;
  this.handleInputChange = handleStrategyInputChange;
  this.saveModel = saveStrategyModel;
  this.model.set(this.data.joinData);
  this.draggingIndex = null;
  rSortedAttackSequence.set([]);
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
  const submitData = _.pick(model, 'spCost', 'normalManner', 'specialManner');
  submitData.attackSequence = rSortedAttackSequence.get();
  Meteor.customCall('decideArenaStrategy', model.companyId, submitData, (error) => {
    if (! error) {
      alertDialog.alert('決策完成！');
    }
  });
}
Template.arenaStrategyForm.helpers({
  spForecast() {
    const sp = getAttributeNumber('sp', this.joinData.sp);
    const model = Template.instance().model.get();
    const spCost = model.spCost;
    const tenRoundForecast = Math.floor(Math.min((sp + 1) / spCost, spCost));
    const maximumRound = Meteor.settings.public.arenaMaximumRound;
    const maximumForecast = Math.floor(Math.min((sp + Math.floor(maximumRound / 10)) / spCost, spCost / 10 * maximumRound));


    return `目前的SP量為 ${sp}
      ，在 10 回合的戰鬥中估計可以發出 ${tenRoundForecast} 次特殊攻擊，
      在 ${maximumRound} 回合的戰鬥中估計可以發出 ${maximumForecast} 次特殊攻擊。`;
  },
  getManner(type, index) {
    const model = Template.instance().model.get();
    const fieldName = type + 'Manner';

    return model[fieldName][index];
  },
  hasEnemy() {
    return this.shuffledFighterCompanyIdList.length > 0;
  },
  enemyList() {
    const shuffledFighterCompanyIdList = this.shuffledFighterCompanyIdList;
    const model = Template.instance().model.get();

    return _.map(model.attackSequence, (attackIndex) => {
      return {
        _id: attackIndex,
        companyId: shuffledFighterCompanyIdList[attackIndex]
      };
    });
  },
  notSorted(index) {
    return ! _.contains(rSortedAttackSequence.get(), index);
  },
  sortedEnemyList() {
    const shuffledFighterCompanyIdList = this.shuffledFighterCompanyIdList;

    return _.map(rSortedAttackSequence.get(), (attackIndex) => {
      return {
        _id: attackIndex,
        companyId: shuffledFighterCompanyIdList[attackIndex]
      };
    });
  }
});
Template.arenaStrategyForm.events({
  'click [data-action="sortAll"]'(event, templateInstance) {
    const model = templateInstance.model.get();
    const attackSequence = rSortedAttackSequence.get();
    rSortedAttackSequence.set(_.union(attackSequence, model.attackSequence));
  },
  'click [data-add]'(event) {
    const index = parseFloat($(event.currentTarget).attr('data-add'));
    const sortedAttackSequence = rSortedAttackSequence.get();
    rSortedAttackSequence.set(_.union(sortedAttackSequence, [index]));
  },
  'click [data-remove]'(event) {
    const index = parseFloat($(event.currentTarget).attr('data-remove'));
    const sortedAttackSequence = rSortedAttackSequence.get();
    rSortedAttackSequence.set(_.without(sortedAttackSequence, index));
  },
  reset(event, templateInstance) {
    event.preventDefault();
    templateInstance.model.set(templateInstance.data.joinData);
    rSortedAttackSequence.set([]);
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
