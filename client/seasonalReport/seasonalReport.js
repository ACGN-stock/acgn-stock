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
import { dbResourceLock } from '../../db/dbResourceLock';
import { dbSeason } from '../../db/dbSeason';
import { dbVariables } from '../../db/dbVariables';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';

inheritedShowLoadingOnSubscribing(Template.seasonalReport);
Template.seasonalReport.onCreated(function() {
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    this.subscribe('currentSeason');
  });
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const seasonId = FlowRouter.getParam('seasonId');
    if (seasonId) {
      this.subscribe('adjacentSeason', seasonId);
    }
  });
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const seasonId = FlowRouter.getParam('seasonId');
    if (seasonId) {
      this.subscribe('rankListBySeasonId', seasonId);
    }
  });
});
const rShowTableType = new ReactiveVar('userRankTable');
const rShowChart = new ReactiveVar(false);
const btnHash = {
  userRankTable: '使用者財富排行榜',
  companyProfitRankTable: '公司營利排行榜',
  companyValueRankTable: '公司總值排行榜',
  companyPriceRankTable: '公司股價排行榜'
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

Template.userRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankUserWealth.find({seasonId}).fetch();
    const sortedRankList = _.sortBy(rankList, (rankData) => {
      return (rankData.money + rankData.stocksValue);
    });

    return sortedRankList.reverse();
  }
});

Template.companyProfitRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankCompanyProfit.find({seasonId}).fetch();
    const sortedRankList = _.sortBy(rankList, 'profit');

    return sortedRankList.reverse();
  }
});

Template.companyValueRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankCompanyValue.find({seasonId}).fetch();
    const sortedRankList = _.sortBy(rankList, 'totalValue');

    return sortedRankList.reverse();
  }
});

Template.companyPriceRankTable.helpers({
  rankList() {
    const seasonId = FlowRouter.getParam('seasonId');
    const rankList = dbRankCompanyPrice.find({seasonId}).fetch();
    const sortedRankList = _.sortBy(rankList, 'lastPrice');

    return sortedRankList.reverse();
  }
});

Template.rankChart.onRendered(function() {
  this.chart = null;
  this.ctx = this.$('canvas')[0].getContext('2d');
  this.autorun(() => {
    drawChart.apply(this);
  });
});
function drawChart() {
  if (this.chart) {
    this.chart.destroy();
  }
  if (! rShowChart.get()) {
    return;
  }
  if (rShowTableType.get() === 'userRankTable') {
    drawUserRankChart.apply(this);
  }
  else {
    drawCompanyRankChart.apply(this);
  }
}
function drawUserRankChart() {
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dbRankUserWealth.find({seasonId}).fetch();
  const sortedRankList = _.sortBy(rankList, (rankData) => {
    return (rankData.money + rankData.stocksValue);
  }).reverse();
  this.ctx.canvas.height = 8 * sortedRankList.length;

  const userNames = {};
  const promises = sortedRankList.map(function(x) {
    return $.ajax({
      url: '/userName',
      data: {
        id: x.userId
      },
      success: (userName) => {
        userNames[x.userId] = userName;
      }
    });
  });

  const templateInstance = this;
  $.when(...promises).then(function() {
    const data = {
      labels: sortedRankList.map(function(x) {
        return userNames[x.userId];
      }),
      datasets: [ {
        label: '持有現金',
        backgroundColor: '#ff8800',
        borderColor: '#aaa',
        data: sortedRankList.map(function(x) {
          return x.money;
        })
      }, {
        label: '持股總值',
        backgroundColor: '#77b300',
        borderColor: '#aaa',
        data: sortedRankList.map(function(x) {
          return x.stocksValue;
        })
      } ]
    };

    templateInstance.chart = new Chart(templateInstance.ctx, {
      type: 'horizontalBar',
      data: data,
      options: {
        responsive: true,
        tooltips: {
          mode: 'y',
          intersect: false
        },
        scales: {
          xAxes: [ {
            position: 'top',
            stacked: true,
            gridLines: {
              color: '#aaa'
            }
          } ],
          yAxes: [ {
            stacked: true,
            gridLines: {
              color: '#aaa'
            },
            barPercentage: 0.6
          } ]
        }
      }
    });
  });
}
function drawCompanyRankChart() {
  const dataSource = {
    companyProfitRankTable: {
      key: 'profit',
      db: dbRankCompanyProfit,
      profitColor: 'rgba(255, 136, 0, 1)',
      totalValueColor: 'rgba(119, 179, 0, 0.2)',
      lastPriceColor: 'rgba(42, 159, 214, 0.2)'
    },
    companyValueRankTable: {
      key: 'totalValue',
      db: dbRankCompanyValue,
      profitColor: 'rgba(255, 136, 0, 0.2)',
      totalValueColor: 'rgba(119, 179, 0, 1)',
      lastPriceColor: 'rgba(42, 159, 214, 0.2)'
    },
    companyPriceRankTable: {
      key: 'lastPrice',
      db: dbRankCompanyPrice,
      profitColor: 'rgba(255, 136, 0, 0.2)',
      totalValueColor: 'rgba(119, 179, 0, 0.2)',
      lastPriceColor: 'rgba(42, 159, 214, 1)'
    }
  };
  const type = rShowTableType.get();
  const seasonId = FlowRouter.getParam('seasonId');
  const rankList = dataSource[type].db.find({seasonId}).fetch();
  const sortedRankList = _.sortBy(rankList, dataSource[type].key).reverse();
  this.ctx.canvas.height = 14 * sortedRankList.length;

  const companyNames = {};
  const promises = sortedRankList.map(function(x) {
    return $.ajax({
      url: '/companyName',
      data: {
        id: x.companyId
      },
      success: (companyName) => {
        companyNames[x.companyId] = companyName;
      }
    });
  });

  const templateInstance = this;
  $.when(...promises).then(function() {
    const chartData = {
      labels: sortedRankList.map(function(x) {
        return companyNames[x.companyId];
      }),
      datasets: [ {
        label: '當季營利',
        backgroundColor: dataSource[type].profitColor,
        borderColor: '#aaa',
        xAxisID: 'x-axis-profit',
        data: sortedRankList.map(function(x) {
          return x.profit;
        })
      }, {
        label: '總市值',
        backgroundColor: dataSource[type].totalValueColor,
        borderColor: '#aaa',
        xAxisID: 'x-axis-value',
        data: sortedRankList.map(function(x) {
          return x.totalValue;
        })
      }, {
        label: '收盤股價',
        backgroundColor: dataSource[type].lastPriceColor,
        borderColor: '#aaa',
        xAxisID: 'x-axis-price',
        data: sortedRankList.map(function(x) {
          return x.lastPrice;
        })
      } ]
    };

    const options = {
      responsive: true,
      scales: {
        xAxes: [ {
          id: 'x-axis-profit',
          type: 'linear',
          display: type === 'companyProfitRankTable',
          position: 'top',
          ticks: {
            beginAtZero: true
          },
          gridLines: {
            color: '#aaa'
          }
        },
        {
          id: 'x-axis-value',
          type: 'linear',
          display: type === 'companyValueRankTable',
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
          display: type === 'companyPriceRankTable',
          type: 'linear',
          position: 'top',
          ticks: {
            beginAtZero: true
          },
          gridLines: {
            color: '#aaa'
          }
        } ],
        yAxes: [ {
          gridLines: {
            color: '#aaa'
          }
        } ]
      }
    };

    templateInstance.chart = new Chart(templateInstance.ctx, {
      type: 'horizontalBar',
      data: chartData,
      options: options
    });
  });
}
