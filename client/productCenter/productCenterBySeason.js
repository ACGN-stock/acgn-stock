import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbProducts } from '/db/dbProducts';
import { dbSeason } from '/db/dbSeason';
import { dbVoteRecord } from '/db/dbVoteRecord';

import { voteProduct, adminEditProduct, banProduct } from '../utils/methods';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { shouldStopSubscribe } from '../utils/idle';

inheritedShowLoadingOnSubscribing(Template.productCenterBySeason);
const rProductSortBy = new ReactiveVar('voteCount');
const rProductSortDir = new ReactiveVar(-1);
const rProductOffset = new ReactiveVar(0);
Template.productCenterBySeason.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const seasonId = FlowRouter.getParam('seasonId');
    if (seasonId) {
      rProductOffset.set(0);
      this.subscribe('adjacentSeason', seasonId);
    }
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
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
              'href': FlowRouter.path('productCenterBySeason', { seasonId })
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
          if (navSeasonData) {
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
              'href': FlowRouter.path('productCenterBySeason', { seasonId })
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
        },
        limit: 30
      }
    );
  },
  getSortButtonClass(fieldName) {
    if (fieldName === rProductSortBy.get()) {
      return 'active';
    }
    else {
      return '';
    }
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
  this.subscribe('currentUserVoteRecord', this.data.companyId);
});
Template.productInfoBySeasonTable.helpers({
  cannotVote() {
    const userId = Meteor.userId();
    const { companyId, state } = Template.currentData();

    return ! userId || state !== 'marketing' || dbVoteRecord.find({ companyId, userId }).count() > 0;
  }
});
Template.productInfoBySeasonTable.events({
  'click [data-vote-product]'(event, templateInstance) {
    event.preventDefault();
    const productData = templateInstance.data;
    voteProduct(productData._id, productData.companyId);
  },
  'click [data-ban-product]'(event, templateInstance) {
    event.preventDefault();
    const { _id: productId } = templateInstance.data;
    banProduct(productId);
  },
  'click [data-edit-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-edit-product');
    adminEditProduct(productId);
  }
});
