'use strict';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbRankCompanyPrice } from '../../db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '../../db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '../../db/dbRankCompanyValue';
import { dbRankUserWealth } from '../../db/dbRankUserWealth';
import { dbSeason } from '../../db/dbSeason';
import { dbVariables } from '../../db/dbVariables';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { shouldStopSubscribe } from '../utils/idle';

inheritedShowLoadingOnSubscribing(Template.seasonalReport);
Template.seasonalReport.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const seasonId = FlowRouter.getParam('seasonId');
    if (seasonId) {
      this.subscribe('adjacentSeason', seasonId);
    }
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const seasonId = FlowRouter.getParam('seasonId');
    if (seasonId) {
      this.subscribe('rankListBySeasonId', seasonId);
    }
  });
});
const rShowTableType = new ReactiveVar('companyPriceRankTable');
const rShowChart = new ReactiveVar(false);
const btnHash = {
  companyPriceRankTable: '股票熱門排行榜',
  companyProfitRankTable: '股票營利排行榜',
  companyValueRankTable: '股票資本排行榜',
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
              'href': FlowRouter.path('seasonalReport', {seasonId})
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
              'href': FlowRouter.path('seasonalReport', {seasonId})
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
    const rankList = dbRankCompanyPrice.find({seasonId}).map((rankData) => {
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
    const rankList = dbRankCompanyProfit.find({seasonId}).fetch();
    const sortedRankList = _.sortBy(rankList, 'priceToEarn');

    return sortedRankList.reverse();
  }
});

Template.companyValueRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankCompanyValue.find({seasonId}).map((rankData) => {
      rankData.totalValue = rankData.lastPrice * rankData.totalRelease;

      return rankData;
    });
    const sortedRankList = _.sortBy(rankList, 'totalValue');

    return sortedRankList.reverse();
  }
});

Template.userRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankUserWealth.find({seasonId}).map((rankData) => {
      rankData.totalWealth = rankData.money + rankData.stocksValue;

      return rankData;
    });
    const sortedRankList = _.sortBy(rankList, 'totalWealth');

    return sortedRankList.reverse();
  }
});

Template.rankChart.onRendered(function() {
  this.chart = null;
  this.ctx = this.$('canvas')[0].getContext('2d');
  this.autorun(() => {
    drawChart(this);
  });
});
Template.rankChart.onDestroyed(function() {
  if (this.chart) {
    this.chart.destroy();
  }
});
function drawChart(templateInstance) {
  if (templateInstance.chart) {
    templateInstance.chart.destroy();
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
    case 'userRankTable': {
      drawUserRankChart(templateInstance);
      break;
    }
  }
}
function drawCompanyPriceRankTable(templateInstance) {
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dbRankCompanyPrice.find({seasonId}).map((rankData) => {
    rankData.totalMoney = rankData.totalDealMoney + rankData.productProfit;

    return rankData;
  });
  if (rankList.length < 1) {
    return false;
  }
  templateInstance.ctx.canvas.height = 14 * rankList.length + 20;

  const companyNameHash = {};
  const deferredList = _.map(rankList, (rankData) => {
    return $.ajax({
      url: '/companyName',
      data: {
        id: rankData.companyId
      },
      success: (companyName) => {
        if (companyName.length > 8) {
          companyNameHash[rankData.companyId] = companyName.slice(0, 5) + '...';
        }
        else {
          companyNameHash[rankData.companyId] = companyName;
        }
      }
    });
  });

  const sortedRankList = _.sortBy(rankList, 'totalMoney').reverse();
  $.when(...deferredList).then(function() {
    const chartData = {
      labels: _.map(sortedRankList, (rankData) => {
        return companyNameHash[rankData.companyId];
      }),
      datasets: [
        {
          label: '產品營利',
          backgroundColor: '#ff8800',
          borderColor: '#aaa',
          data: _.pluck(sortedRankList, 'productProfit')
        },
        {
          label: '季成交額',
          backgroundColor: '#77b300',
          borderColor: '#aaa',
          data: _.pluck(sortedRankList, 'totalDealMoney')
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      scales: {
        xAxes: [
          {
            display: true,
            type: 'linear',
            position: 'top',
            ticks: {
              beginAtZero: true
            },
            gridLines: {
              color: '#aaa'
            }
          }
        ],
        yAxes: [
          {
            stacked: true,
            gridLines: {
              color: '#aaa'
            },
            barPercentage: 0.6
          }
        ]
      }
    };

    templateInstance.chart = new Chart(templateInstance.ctx, {
      type: 'horizontalBar',
      data: chartData,
      options: chartOptions
    });
  });
}
function drawCompanyProfitRankTable(templateInstance) {
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dbRankCompanyProfit.find({seasonId}).fetch();
  if (rankList.length < 1) {
    return false;
  }
  templateInstance.ctx.canvas.height = 14 * rankList.length + 20;

  const companyNameHash = {};
  const deferredList = _.map(rankList, (rankData) => {
    return $.ajax({
      url: '/companyName',
      data: {
        id: rankData.companyId
      },
      success: (companyName) => {
        if (companyName.length > 8) {
          companyNameHash[rankData.companyId] = companyName.slice(0, 5) + '...';
        }
        else {
          companyNameHash[rankData.companyId] = companyName;
        }
      }
    });
  });

  const sortedRankList = _.sortBy(rankList, 'priceToEarn').reverse();
  $.when(...deferredList).then(function() {
    const chartData = {
      labels: _.map(sortedRankList, (rankData) => {
        return companyNameHash[rankData.companyId];
      }),
      datasets: [
        {
          label: '益本比',
          xAxisID: 'x-axis-ratio',
          backgroundColor: 'rgba(255, 136, 0, 1)',
          borderColor: '#aaa',
          data: _.pluck(sortedRankList, 'priceToEarn')
        },
        {
          label: '季營利額',
          xAxisID: 'x-axis-profit',
          backgroundColor: 'rgba(119, 179, 0, 0.2)',
          borderColor: '#aaa',
          data: _.pluck(sortedRankList, 'profit')
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      scales: {
        xAxes: [
          {
            id: 'x-axis-ratio',
            type: 'linear',
            position: 'top',
            ticks: {
              beginAtZero: true
            },
            gridLines: {
              color: '#aaa'
            }
          },
          {
            id: 'x-axis-profit',
            display: false,
            type: 'linear',
            position: 'top',
            ticks: {
              beginAtZero: true
            },
            gridLines: {
              color: '#aaa'
            }
          }
        ],
        yAxes: [
          {
            gridLines: {
              color: '#aaa'
            }
          }
        ]
      }
    };

    templateInstance.chart = new Chart(templateInstance.ctx, {
      type: 'horizontalBar',
      data: chartData,
      options: chartOptions
    });
  });
}
function drawCompanyValueRankTable(templateInstance) {
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dbRankCompanyValue.find({seasonId}).map((rankData) => {
    rankData.totalValue = rankData.lastPrice * rankData.totalRelease;

    return rankData;
  });
  if (rankList.length < 1) {
    return false;
  }
  templateInstance.ctx.canvas.height = 14 * rankList.length + 20;

  const companyNameHash = {};
  const deferredList = _.map(rankList, (rankData) => {
    return $.ajax({
      url: '/companyName',
      data: {
        id: rankData.companyId
      },
      success: (companyName) => {
        if (companyName.length > 8) {
          companyNameHash[rankData.companyId] = companyName.slice(0, 5) + '...';
        }
        else {
          companyNameHash[rankData.companyId] = companyName;
        }
      }
    });
  });

  const sortedRankList = _.sortBy(rankList, 'totalValue').reverse();
  $.when(...deferredList).then(function() {
    const chartData = {
      labels: _.map(sortedRankList, (rankData) => {
        return companyNameHash[rankData.companyId];
      }),
      datasets: [
        {
          label: '總市值',
          xAxisID: 'x-axis-value',
          backgroundColor: 'rgba(119, 179, 0, 1)',
          borderColor: '#aaa',
          data: _.pluck(sortedRankList, 'totalValue')
        },
        {
          label: '總釋股數',
          xAxisID: 'x-axis-release',
          backgroundColor: 'rgba(255, 136, 0, 0.2)',
          borderColor: '#aaa',
          data: _.pluck(sortedRankList, 'totalRelease')
        },
        {
          label: '收盤股價',
          xAxisID: 'x-axis-price',
          backgroundColor: 'rgba(42, 159, 214, 0.2)',
          borderColor: '#aaa',
          data: _.pluck(sortedRankList, 'lastPrice')
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      scales: {
        xAxes: [
          {
            id: 'x-axis-value',
            type: 'linear',
            position: 'top',
            ticks: {
              beginAtZero: true
            },
            gridLines: {
              color: '#aaa'
            }
          },
          {
            id: 'x-axis-release',
            display: false,
            type: 'linear',
            position: 'top',
            ticks: {
              beginAtZero: true
            },
            gridLines: {
              color: '#aaa'
            }
          },
          {
            id: 'x-axis-price',
            display: false,
            type: 'linear',
            position: 'top',
            ticks: {
              beginAtZero: true
            },
            gridLines: {
              color: '#aaa'
            }
          }
        ],
        yAxes: [
          {
            gridLines: {
              color: '#aaa'
            }
          }
        ]
      }
    };

    templateInstance.chart = new Chart(templateInstance.ctx, {
      type: 'horizontalBar',
      data: chartData,
      options: chartOptions
    });
  });
}
function drawUserRankChart(templateInstance) {
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dbRankUserWealth.find({seasonId}).map((rankData) => {
    rankData.totalWealth = rankData.money + rankData.stocksValue;

    return rankData;
  });
  if (rankList.length < 1) {
    return false;
  }
  templateInstance.ctx.canvas.height = 8 * rankList.length + 20;
  const userNameHash = {};
  const deferredList = _.map(rankList, (rankData) => {
    return $.ajax({
      url: '/userName',
      data: {
        id: rankData.userId
      },
      success: (userName) => {
        if (userName.length > 13) {
          userNameHash[rankData.userId] = userName.slice(0, 10) + '...';
        }
        else {
          userNameHash[rankData.userId] = userName;
        }
      }
    });
  });

  const sortedRankList = _.sortBy(rankList, 'totalWealth').reverse();
  $.when(...deferredList).then(() => {
    const chartData = {
      labels: _.map(sortedRankList, (rankData) => {
        return userNameHash[rankData.userId];
      }),
      datasets: [
        {
          label: '持有現金',
          backgroundColor: '#ff8800',
          borderColor: '#aaa',
          data: _.pluck(sortedRankList, 'money')
        },
        {
          label: '持股總值',
          backgroundColor: '#77b300',
          borderColor: '#aaa',
          data: _.pluck(sortedRankList, 'stocksValue')
        }
      ]
    };

    templateInstance.chart = new Chart(templateInstance.ctx, {
      type: 'horizontalBar',
      data: chartData,
      options: {
        responsive: true,
        tooltips: {
          mode: 'y',
          intersect: false
        },
        scales: {
          xAxes: [
            {
              position: 'top',
              stacked: true,
              gridLines: {
                color: '#aaa'
              }
            }
          ],
          yAxes: [
            {
              stacked: true,
              gridLines: {
                color: '#aaa'
              },
              barPercentage: 0.6
            }
          ]
        }
      }
    });
  });
}
