import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbRankCompanyPrice } from '/db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '/db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '/db/dbRankCompanyValue';
import { dbRankCompanyCapital } from '/db/dbRankCompanyCapital';
import { dbRankUserWealth } from '/db/dbRankUserWealth';
import { dbSeason, getPreviousSeason } from '/db/dbSeason';
import { dbVariables } from '/db/dbVariables';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { currencyFormat, setChartTheme } from '../utils/helpers';
import { globalVariable } from '../utils/globalVariable';

inheritedShowLoadingOnSubscribing(Template.seasonalReport);
Template.seasonalReport.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const seasonId = FlowRouter.getParam('seasonId');

    if (! seasonId) {
      const previousSeason = getPreviousSeason();

      if (previousSeason) {
        FlowRouter.setParams({ seasonId: previousSeason._id });
      }

      return;
    }

    this.subscribe('adjacentSeason', seasonId);
    this.subscribe('rankListBySeasonId', seasonId);
  });
});
const rShowTableType = new ReactiveVar('companyPriceRankTable');
const rShowChart = new ReactiveVar(false);
const btnHash = {
  companyPriceRankTable: '股票熱門排行榜',
  companyProfitRankTable: '股票營利排行榜',
  companyValueRankTable: '股票市值排行榜',
  companyCapitalRankTable: '公司資本額排行榜',
  userRankTable: '大富翁排行榜'
};
Template.seasonalReport.helpers({
  showTableType() {
    if (rShowChart.get()) {
      return 'rankChart';
    }

    return rShowTableType.get();
  },
  displayTableTitle() {
    return btnHash[rShowTableType.get()];
  }
});

Template.reportSeasonNav.helpers({
  seasonLinkAttrs(linkType) {
    const seasonId = FlowRouter.getParam('seasonId');
    const currentSeasonData = dbSeason.findOne(seasonId);

    if (currentSeasonData) {
      switch (linkType) {
        case 'prev': {
          const navSeasonData = dbSeason.findOne(
            {
              beginDate: {
                $lt: currentSeasonData.beginDate
              }
            },
            {
              sort: {
                beginDate: -1
              }
            }
          );
          if (navSeasonData) {
            return {
              'class': 'btn btn-info btn-sm float-left',
              'href': FlowRouter.path('seasonalReport', {
                seasonId: navSeasonData._id
              })
            };
          }
          else {
            return {
              'class': 'btn btn-info btn-sm float-left disabled',
              'href': FlowRouter.path('seasonalReport', { seasonId })
            };
          }
        }
        case 'next': {
          const navSeasonData = dbSeason.findOne(
            {
              beginDate: {
                $gt: currentSeasonData.beginDate
              }
            },
            {
              sort: {
                beginDate: 1
              }
            }
          );
          if (navSeasonData && navSeasonData._id !== dbVariables.get('currentSeasonId')) {
            return {
              'class': 'btn btn-info btn-sm float-right',
              'href': FlowRouter.path('seasonalReport', {
                seasonId: navSeasonData._id
              })
            };
          }
          else {
            return {
              'class': 'btn btn-info btn-sm float-right disabled',
              'href': FlowRouter.path('seasonalReport', { seasonId })
            };
          }
        }
      }
    }
  },
  seasonBegin() {
    const seasonId = FlowRouter.getParam('seasonId');
    const currentSeasonData = dbSeason.findOne(seasonId);

    return currentSeasonData ? currentSeasonData.beginDate : null;
  },
  seasonEnd() {
    const seasonId = FlowRouter.getParam('seasonId');
    const currentSeasonData = dbSeason.findOne(seasonId);

    return currentSeasonData ? currentSeasonData.endDate : null;
  }
});

Template.reportTableSelectButton.helpers({
  btnClass() {
    if (this.type === rShowTableType.get()) {
      return 'btn btn-primary';
    }
    else {
      return 'btn btn-info';
    }
  },
  btnText() {
    return btnHash[this.type];
  }
});
Template.reportTableSelectButton.events({
  click(event, templateInstance) {
    event.preventDefault();
    rShowTableType.set(templateInstance.data.type);
  }
});

Template.switchViewTypeButton.helpers({
  btnText() {
    if (rShowChart.get()) {
      return '圖表模式';
    }

    return '表格模式';
  }
});
Template.switchViewTypeButton.events({
  click(event) {
    event.preventDefault();
    rShowChart.set(! rShowChart.get());
  }
});

Template.companyPriceRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankCompanyPrice.find({ seasonId }).map((rankData) => {
      rankData.totalMoney = rankData.totalDealMoney + rankData.productProfit;

      return rankData;
    });
    const sortedRankList = _.sortBy(rankList, 'totalMoney');

    return sortedRankList.reverse();
  }
});

Template.companyProfitRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankCompanyProfit.find({ seasonId }).fetch();
    const sortedRankList = _.sortBy(rankList, 'priceToEarn');

    return sortedRankList.reverse();
  }
});

Template.companyValueRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankCompanyValue.find({ seasonId }).map((rankData) => {
      rankData.totalValue = rankData.lastPrice * rankData.totalRelease;

      return rankData;
    });
    const sortedRankList = _.sortBy(rankList, 'totalValue');

    return sortedRankList.reverse();
  }
});

Template.companyCapitalRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankCompanyCapital.find({ seasonId }).fetch();
    const sortedRankList = _.sortBy(rankList, 'capital');

    return sortedRankList.reverse();
  }
});

Template.userRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankUserWealth.find({ seasonId }).map((rankData) => {
      rankData.totalWealth = rankData.money + rankData.stocksValue;

      return rankData;
    });
    const sortedRankList = _.sortBy(rankList, 'totalWealth');

    return sortedRankList.reverse();
  }
});

Template.rankChart.onRendered(function() {
  this.chart = this.$('.chart-container');
  this.autorun(() => {
    drawChart(this);
  });
});
Template.rankChart.onDestroyed(function() {
  if (this.chart) {
    this.chart.empty();
  }
});
function drawChart(templateInstance) {
  if (templateInstance.chart) {
    templateInstance.chart.empty();
  }

  switch (globalVariable.get('theme')) {
    case 'dark':
      setChartTheme('gray');
      break;
    default:
      setChartTheme('gridLight');
      break;
  }

  switch (rShowTableType.get()) {
    case 'companyPriceRankTable': {
      drawCompanyPriceRankTable(templateInstance);
      break;
    }
    case 'companyProfitRankTable': {
      drawCompanyProfitRankTable(templateInstance);
      break;
    }
    case 'companyValueRankTable': {
      drawCompanyValueRankTable(templateInstance);
      break;
    }
    case 'companyCapitalRankTable': {
      drawCompanyCapitalRankTable(templateInstance);
      break;
    }
    case 'userRankTable': {
      drawUserRankChart(templateInstance);
      break;
    }
  }
}

// 股票熱門排行榜圖表
function drawCompanyPriceRankTable(templateInstance) {
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dbRankCompanyPrice.find({ seasonId }).map((rankData) => {
    rankData.totalMoney = rankData.totalDealMoney + rankData.productProfit;

    return rankData;
  });

  if (rankList.length < 1) {
    return false;
  }
  const chartHeight = 20 * rankList.length + 125;
  templateInstance.chart.height(chartHeight);

  const companyNameHash = {};
  const deferredList = _.map(rankList, (rankData) => {
    return $.ajax({
      url: '/companyInfo',
      data: {
        id: rankData.companyId
      },
      dataType: 'json',
      success: (companyData) => {
        const { companyName } = companyData;
        if (companyName.length > 8) {
          companyNameHash[rankData.companyId] = companyName.slice(0, 7) + '...';
        }
        else {
          companyNameHash[rankData.companyId] = companyName;
        }
      }
    });
  });

  const sortedRankList = _.sortBy(rankList, 'totalMoney').reverse();
  $.when(...deferredList).then(function() {
    const xAxisLabel = _.map(sortedRankList, (rankData) => {
      return companyNameHash[rankData.companyId];
    });

    Highcharts.chart({
      chart: {
        type: 'bar',
        renderTo: templateInstance.chart[0]
      },
      title: {
        text: null
      },
      xAxis: {
        categories: xAxisLabel,
        gridLineWidth: 1
      },
      yAxis: [
        {
          allowDecimals: false,
          min: 0,
          opposite: true,
          title: {
            text: null
          }
        },
        {
          allowDecimals: false,
          min: 0,
          title: {
            text: null
          },
          linkedTo: 0
        }
      ],
      legend: {
        verticalAlign: 'top',
        reversed: true
      },
      credits: {
        enabled: false
      },
      plotOptions: {
        series: {
          stacking: 'normal'
        },
        bar: {
          borderWidth: 0,
          groupPadding: 0.1
        }
      },
      tooltip: {
        valueDecimals: 0,
        pointFormatter: function() {
          return '<span style="color:' +
            this.color +
            '">\u25CF</span> ' +
            this.series.name +
            ': <b>$' +
            currencyFormat(this.y) +
            '</b><br/>';
        }
      },
      series: [
        {
          name: '產品營利',
          color: '#ff8800',
          data: _.pluck(sortedRankList, 'productProfit')
        },
        {
          name: '季成交額',
          color: '#77b300',
          data: _.pluck(sortedRankList, 'totalDealMoney')
        }
      ]
    });
  });
}

// 股票營利排行榜圖表
function drawCompanyProfitRankTable(templateInstance) {
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dbRankCompanyProfit.find({ seasonId }).fetch();
  if (rankList.length < 1) {
    return false;
  }
  const chartHeight = 40 * rankList.length + 80;
  templateInstance.chart.height(chartHeight);

  const companyNameHash = {};
  const deferredList = _.map(rankList, (rankData) => {
    return $.ajax({
      url: '/companyInfo',
      data: {
        id: rankData.companyId
      },
      dataType: 'json',
      success: (companyData) => {
        const { companyName } = companyData;
        if (companyName.length > 8) {
          companyNameHash[rankData.companyId] = companyName.slice(0, 7) + '...';
        }
        else {
          companyNameHash[rankData.companyId] = companyName;
        }
      }
    });
  });

  const sortedRankList = _.sortBy(rankList, 'priceToEarn').reverse();
  $.when(...deferredList).then(function() {
    const xAxisLabel = _.map(sortedRankList, (rankData) => {
      return companyNameHash[rankData.companyId];
    });

    Highcharts.chart({
      chart: {
        type: 'bar',
        renderTo: templateInstance.chart[0]
      },
      title: {
        text: null
      },
      xAxis: {
        categories: xAxisLabel,
        gridLineWidth: 1
      },
      yAxis: [
        {
          id: 'x-axis-peratio',
          min: 0,
          opposite: true,
          title: {
            text: null
          },
          visible: false
        },
        {
          id: 'x-axis-profit',
          allowDecimals: false,
          min: 0,
          title: {
            text: null
          },
          visible: false
        }
      ],
      legend: {
        verticalAlign: 'top'
      },
      credits: {
        enabled: false
      },
      plotOptions: {
        bar: {
          borderWidth: 0,
          groupPadding: 0.1
        },
        series: {
          dataLabels: {
            enabled: true,
            style: {
              textOutline: 'none'
            }
          }
        },
        yAxis: {
          gridLineWidth: 0
        }
      },
      series: [
        {
          name: '益本比',
          color: 'rgba(255, 136, 0, 1)',
          yAxis: 'x-axis-peratio',
          data: _.pluck(sortedRankList, 'priceToEarn')
        },
        {
          name: '季營利額',
          color: 'rgba(119, 179, 0, 0.4)',
          yAxis: 'x-axis-profit',
          data: _.pluck(sortedRankList, 'profit'),
          dataLabels: {
            formatter: function() {
              return '$' + currencyFormat(this.y);
            }
          },
          tooltip: {
            valueDecimals: 0,
            pointFormatter: function() {
              return '<span style="color:' +
                this.color +
                '">\u25CF</span> ' +
                this.series.name +
                ': <b>$' +
                currencyFormat(this.y) +
                '</b><br/>';
            }
          }
        }
      ]
    });
  });
}

// 股票市值排行榜圖表
function drawCompanyValueRankTable(templateInstance) {
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dbRankCompanyValue.find({ seasonId }).map((rankData) => {
    rankData.totalValue = rankData.lastPrice * rankData.totalRelease;

    return rankData;
  });
  if (rankList.length < 1) {
    return false;
  }
  const chartHeight = 60 * rankList.length + 80;
  templateInstance.chart.height(chartHeight);

  const companyNameHash = {};
  const deferredList = _.map(rankList, (rankData) => {
    return $.ajax({
      url: '/companyInfo',
      data: {
        id: rankData.companyId
      },
      dataType: 'json',
      success: (companyData) => {
        const { companyName } = companyData;
        if (companyName.length > 8) {
          companyNameHash[rankData.companyId] = companyName.slice(0, 7) + '...';
        }
        else {
          companyNameHash[rankData.companyId] = companyName;
        }
      }
    });
  });

  const sortedRankList = _.sortBy(rankList, 'totalValue').reverse();
  $.when(...deferredList).then(function() {
    const xAxisLabel = _.map(sortedRankList, (rankData) => {
      return companyNameHash[rankData.companyId];
    });

    Highcharts.chart({
      chart: {
        type: 'bar',
        renderTo: templateInstance.chart[0]
      },
      title: {
        text: null
      },
      xAxis: {
        categories: xAxisLabel,
        gridLineWidth: 1
      },
      yAxis: [
        {
          id: 'x-axis-value',
          allowDecimals: false,
          min: 0,
          opposite: true,
          title: {
            text: null
          },
          visible: false
        },
        {
          id: 'x-axis-release',
          allowDecimals: false,
          min: 0,
          opposite: true,
          title: {
            text: null
          },
          visible: false
        },
        {
          id: 'x-axis-price',
          allowDecimals: false,
          min: 0,
          title: {
            text: null
          },
          visible: false
        }
      ],
      legend: {
        verticalAlign: 'top'
      },
      credits: {
        enabled: false
      },
      plotOptions: {
        bar: {
          borderWidth: 0,
          groupPadding: 0.1
        },
        series: {
          dataLabels: {
            enabled: true,
            style: {
              textOutline: 'none'
            }
          }
        },
        yAxis: {
          gridLineWidth: 0
        }
      },
      series: [
        {
          name: '總市值',
          color: 'rgba(119, 179, 0, 1)',
          yAxis: 'x-axis-value',
          data: _.pluck(sortedRankList, 'totalValue'),
          dataLabels: {
            formatter: function() {
              return '$' + currencyFormat(this.y);
            }
          },
          tooltip: {
            valueDecimals: 0,
            pointFormatter: function() {
              return '<span style="color:' +
                this.color +
                '">\u25CF</span> ' +
                this.series.name +
                ': <b>$' +
                currencyFormat(this.y) +
                '</b><br/>';
            }
          }
        },
        {
          name: '總釋股數',
          color: 'rgba(255, 136, 0, 0.4)',
          yAxis: 'x-axis-release',
          data: _.pluck(sortedRankList, 'totalRelease')
        },
        {
          name: '收盤股價',
          color: 'rgba(42, 159, 214, 0.4)',
          data: _.pluck(sortedRankList, 'lastPrice'),
          dataLabels: {
            formatter: function() {
              return '$' + currencyFormat(this.y);
            }
          },
          yAxis: 'x-axis-price',
          tooltip: {
            valueDecimals: 0,
            pointFormatter: function() {
              return '<span style="color:' +
                this.color +
                '">\u25CF</span> ' +
                this.series.name +
                ': <b>$' +
                currencyFormat(this.y) +
                '</b><br/>';
            }
          }
        }
      ]
    });
  });
}

// 公司資本額排行榜圖表
function drawCompanyCapitalRankTable(templateInstance) {
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dbRankCompanyCapital.find({ seasonId }).fetch();

  if (rankList.length < 1) {
    return false;
  }
  const chartHeight = 60 * rankList.length + 125;
  templateInstance.chart.height(chartHeight);

  const companyNameHash = {};
  const deferredList = _.map(rankList, (rankData) => {
    return $.ajax({
      url: '/companyInfo',
      data: {
        id: rankData.companyId
      },
      dataType: 'json',
      success: (companyData) => {
        const { companyName } = companyData;
        if (companyName.length > 8) {
          companyNameHash[rankData.companyId] = companyName.slice(0, 7) + '...';
        }
        else {
          companyNameHash[rankData.companyId] = companyName;
        }
      }
    });
  });

  const sortedRankList = _.sortBy(rankList, 'capital').reverse();
  $.when(...deferredList).then(function() {
    const xAxisLabel = _.map(sortedRankList, (rankData) => {
      return companyNameHash[rankData.companyId];
    });

    Highcharts.chart({
      chart: {
        type: 'bar',
        renderTo: templateInstance.chart[0]
      },
      title: {
        text: null
      },
      xAxis: {
        categories: xAxisLabel,
        gridLineWidth: 1
      },
      yAxis: [
        {
          id: 'x-axis-capital',
          allowDecimals: false,
          min: 0,
          opposite: true,
          title: {
            text: null
          },
          visible: false
        },
        {
          id: 'x-axis-value',
          allowDecimals: false,
          min: 0,
          opposite: true,
          title: {
            text: null
          },
          visible: false
        },
        {
          id: 'x-axis-release',
          allowDecimals: false,
          min: 0,
          title: {
            text: null
          },
          visible: false
        }
      ],
      legend: {
        verticalAlign: 'top',
        reversed: true
      },
      credits: {
        enabled: false
      },
      plotOptions: {
        bar: {
          borderWidth: 0,
          groupPadding: 0.1
        },
        series: {
          dataLabels: {
            enabled: true,
            style: {
              textOutline: 'none'
            }
          }
        },
        yAxis: {
          gridLineWidth: 0
        }
      },
      series: [
        {
          name: '資本額',
          color: 'rgba(119, 179, 0, 1)',
          yAxis: 'x-axis-capital',
          data: _.pluck(sortedRankList, 'capital'),
          dataLabels: {
            formatter: function() {
              return '$' + currencyFormat(this.y);
            }
          },
          tooltip: {
            valueDecimals: 0,
            pointFormatter: function() {
              return '<span style="color:' +
                this.color +
                '">\u25CF</span> ' +
                this.series.name +
                ': <b>$' +
                currencyFormat(this.y) +
                '</b><br/>';
            }
          }
        },
        {
          name: '總市值',
          color: 'rgba(255, 136, 0, 0.4)',
          yAxis: 'x-axis-value',
          data: _.pluck(sortedRankList, 'totalValue'),
          dataLabels: {
            formatter: function() {
              return '$' + currencyFormat(this.y);
            }
          },
          tooltip: {
            valueDecimals: 0,
            pointFormatter: function() {
              return '<span style="color:' +
                this.color +
                '">\u25CF</span> ' +
                this.series.name +
                ': <b>$' +
                currencyFormat(this.y) +
                '</b><br/>';
            }
          }
        },
        {
          name: '總釋股數',
          color: 'rgba(42, 159, 214, 0.4)',
          data: _.pluck(sortedRankList, 'totalRelease'),
          yAxis: 'x-axis-release'
        }
      ]
    });
  });
}

// 大富翁排行榜圖表
function drawUserRankChart(templateInstance) {
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dbRankUserWealth.find({ seasonId }).map((rankData) => {
    rankData.totalWealth = rankData.money + rankData.stocksValue;

    return rankData;
  });
  if (rankList.length < 1) {
    return false;
  }
  const chartHeight = 20 * rankList.length + 80;
  templateInstance.chart.height(chartHeight);

  const userNameHash = {};
  const deferredList = _.map(rankList, (rankData) => {
    return $.ajax({
      url: '/userInfo',
      data: {
        id: rankData.userId
      },
      dataType: 'json',
      success: (userData) => {
        const userName = userData.name;
        if (userName.length > 13) {
          userNameHash[rankData.userId] = userName.slice(0, 12) + '...';
        }
        else {
          userNameHash[rankData.userId] = userName;
        }
      }
    });
  });

  const sortedRankList = _.sortBy(rankList, 'totalWealth').reverse();
  $.when(...deferredList).then(() => {
    const xAxisLabel = _.map(sortedRankList, (rankData) => {
      return userNameHash[rankData.userId];
    });

    Highcharts.chart({
      chart: {
        type: 'bar',
        renderTo: templateInstance.chart[0]
      },
      title: {
        text: null
      },
      xAxis: {
        categories: xAxisLabel,
        gridLineWidth: 1
      },
      yAxis: [
        {
          allowDecimals: false,
          min: 0,
          opposite: true,
          title: {
            text: null
          }
        },
        {
          allowDecimals: false,
          min: 0,
          title: {
            text: null
          },
          linkedTo: 0
        }
      ],
      legend: {
        verticalAlign: 'top',
        reversed: true
      },
      credits: {
        enabled: false
      },
      plotOptions: {
        series: {
          stacking: 'normal'
        },
        bar: {
          borderWidth: 0,
          groupPadding: 0.1
        }
      },
      tooltip: {
        valueDecimals: 0,
        pointFormatter: function() {
          return '<span style="color:' +
            this.color +
            '">\u25CF</span> ' +
            this.series.name +
            ': <b>$' +
            currencyFormat(this.y) +
            '</b><br/>';
        }
      },
      series: [
        {
          name: '持有現金',
          color: '#ff8800',
          data: _.pluck(sortedRankList, 'money')
        },
        {
          name: '持股總值',
          color: '#77b300',
          data: _.pluck(sortedRankList, 'stocksValue')
        }
      ]
    });
  });
}
