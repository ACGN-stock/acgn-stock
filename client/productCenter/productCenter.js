'use strict';
// import { Meteor } from 'meteor/meteor';
// import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
// import { dbCompanies } from '../../db/dbCompanies';
import { dbProducts } from '../../db/dbProducts';
import { dbSeason } from '../../db/dbSeason';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';

inheritedShowLoadingOnSubscribing(Template.productCenter);
const rSeasonOffset = new ReactiveVar(0);
const rLookSeasonBeginDate = new ReactiveVar();
const rLookSeasonEndDate = new ReactiveVar();
const rProductSortBy = new ReactiveVar('votes');
const rProductSortDir = new ReactiveVar(-1);
const rProductOffset = new ReactiveVar(0);
Template.productCenter.onCreated(function() {
  rSeasonOffset.set(0);
  this.autorun(() => {
    this.subscribe('season', rSeasonOffset.get());
  });
  this.autorun(() => {
    const lookSeasonData = dbSeason.findOne({}, {
      sort: {
        beginDate: -1
      },
      skip: rSeasonOffset.get() === 0 ? 0 : 1,
      limit: 1,
      fields: {
        beginDate: 1,
        endDate: 1
      }
    });
    if (lookSeasonData) {
      rLookSeasonBeginDate.set(lookSeasonData.beginDate);
      rLookSeasonEndDate.set(lookSeasonData.endDate);
    }
  });
  rProductOffset.set(0);
  this.autorun(() => {
    const beginDate = rLookSeasonBeginDate.get();
    const endDate = rLookSeasonEndDate.get();
    if (beginDate && endDate) {
      this.subscribe('productList', {
        beginTime: beginDate.getTime(),
        endTime: endDate.getTime(),
        sortBy: rProductSortBy.get(),
        sortDir: rProductSortDir.get(),
        offset: rProductOffset.get()
      });
    }
  });
});

Template.chooseSeasonForm.helpers({
  isSeasonLinkDisabled(offsetAdjust) {
    switch (offsetAdjust) {
      case -1: {
        return rSeasonOffset.get() === 0;
      }
      case 1: {
        switch (rSeasonOffset.get()) {
          case 0: {
            return dbSeason.find().count() < 2;
          }
          default: {
            return dbSeason.find().count() < 3;
          }
        }
      }
      default: {
        return true;
      }
    }
  },
  seasonBegin() {
    return rLookSeasonBeginDate.get();
  },
  seasonEnd() {
    return rLookSeasonEndDate.get();
  }
});
Template.chooseSeasonForm.events({
  'click [data-action="addOffset"]'(event) {
    event.preventDefault();
    rSeasonOffset.set(rSeasonOffset.get() + 1);
  },
  'click [data-action="minusOffset"]'(event) {
    event.preventDefault();
    rSeasonOffset.set(rSeasonOffset.get() - 1);
  }
});

Template.productListTable.helpers({
  productList() {
    return dbProducts.find(
      {
        createdAt: {
          $gte: rLookSeasonBeginDate.get(),
          $lte: rLookSeasonEndDate.get()
        }
      },
      {
        sort: {
          [rProductSortBy.get()]: rProductSortDir.get()
        }
      }
    );
  },
  canVote() {
    return this.overdue === 1;
  },
  paginationData() {
    return {
      subscribe: 'productList',
      dataNumberPerPage: 30,
      offset: rProductOffset
    };
  }
});
