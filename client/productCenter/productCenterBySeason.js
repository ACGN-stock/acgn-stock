'use strict';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbProducts } from '../../db/dbProducts';
import { dbResourceLock } from '../../db/dbResourceLock';
import { dbSeason } from '../../db/dbSeason';
import { dbVariables } from '../../db/dbVariables';
import { voteProduct } from '../utils/methods';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';

inheritedShowLoadingOnSubscribing(Template.productCenterBySeason);
const rProductSortBy = new ReactiveVar('votes');
const rProductSortDir = new ReactiveVar(-1);
const rProductOffset = new ReactiveVar(0);
Template.productCenterBySeason.onCreated(function() {
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
      rProductOffset.set(0);
      this.subscribe('adjacentSeason', seasonId);
    }
  });
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    const seasonId = FlowRouter.getParam('seasonId');
    if (seasonId) {
      this.subscribe('productListBySeasonId', {
        seasonId: seasonId,
        sortBy: rProductSortBy.get(),
        sortDir: rProductSortDir.get(),
        offset: rProductOffset.get()
      });
    }
  });
});

Template.productSeasonNav.helpers({
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
              'href': FlowRouter.path('productCenterBySeason', {
                seasonId: navSeasonData._id
              })
            };
          }
          else {
            return {
              'class': 'btn btn-info btn-sm float-left disabled',
              'href': FlowRouter.path('productCenterBySeason', {seasonId})
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
              'href': FlowRouter.path('productCenterBySeason', {
                seasonId: navSeasonData._id
              })
            };
          }
          else {
            return {
              'class': 'btn btn-info btn-sm float-right disabled',
              'href': FlowRouter.path('productCenterBySeason', {seasonId})
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

Template.productListBySeasonTable.helpers({
  productList() {
    const seasonId = FlowRouter.getParam('seasonId');

    return dbProducts.find(
      {
        seasonId: seasonId
      },
      {
        sort: {
          [rProductSortBy.get()]: rProductSortDir.get()
        }
      }
    );
  },
  getSortIcon(fieldName) {
    if (fieldName === rProductSortBy.get()) {
      if (rProductSortDir.get() === -1) {
        return `<i class="fa fa-sort-amount-desc" aria-hidden="true"></i>`;
      }
      else {
        return `<i class="fa fa-sort-amount-asc" aria-hidden="true"></i>`;
      }
    }

    return '';
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfProductList',
      dataNumberPerPage: 30,
      offset: rProductOffset
    };
  }
});
Template.productListBySeasonTable.events({
  'click [data-sort]'(event) {
    const sortBy = $(event.currentTarget).attr('data-sort');
    if (rProductSortBy.get() === sortBy) {
      rProductSortDir.set(rProductSortDir.get() * -1);
    }
    else {
      rProductSortBy.set(sortBy);
      rProductSortDir.set(-1);
    }
  }
});

Template.productInfoBySeasonTable.onCreated(function() {
  this.subscribe('queryMyLikeProduct', this.data.companyId);
});
Template.productInfoBySeasonTable.helpers({
  canVote() {
    return this.overdue === 1;
  }
});
Template.productInfoBySeasonTable.events({
  'click [data-vote-product]'(event, templatInstance) {
    event.preventDefault();
    const productData = templatInstance.data;
    voteProduct(productData._id, productData.companyId);
  }
});
