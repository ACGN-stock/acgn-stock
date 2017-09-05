'use strict';
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
  click(event, templateInstance) {
    event.preventDefault();
    rShowChart.set(!rShowChart.get());
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
