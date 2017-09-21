'use strict';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbProducts } from '../../db/dbProducts';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { likeProduct } from '../utils/methods';
import { shouldStopSubscribe } from '../utils/idle';

inheritedShowLoadingOnSubscribing(Template.productCenterByCompany);
const rProductSortBy = new ReactiveVar('likeCount');
const rProductSortDir = new ReactiveVar(-1);
const rProductOffset = new ReactiveVar(0);
Template.productCenterByCompany.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    if (Meteor.user()) {
      this.subscribe('queryOwnStocks');
    }
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('productListByCompany', {
        companyId: companyId,
        sortBy: rProductSortBy.get(),
        sortDir: rProductSortDir.get(),
        offset: rProductOffset.get()
      });
      if (Meteor.user()) {
        this.subscribe('queryMyLikeProduct', companyId);
      }
    }
  });
});
Template.productCenterByCompany.helpers({
  companyId() {
    return FlowRouter.getParam('companyId');
  }
});

Template.productListByCompanyTable.helpers({
  productList() {
    const companyId = FlowRouter.getParam('companyId');

    return dbProducts.find(
      {
        companyId: companyId
      },
      {
        sort: {
          [rProductSortBy.get()]: rProductSortDir.get()
        },
        limit: 30
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
Template.productListByCompanyTable.events({
  'click [data-sort]'(event) {
    const sortBy = $(event.currentTarget).attr('data-sort');
    if (rProductSortBy.get() === sortBy) {
      rProductSortDir.set(rProductSortDir.get() * -1);
    }
    else {
      rProductSortBy.set(sortBy);
      rProductSortDir.set(-1);
    }
  },
  'click [data-like-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-like-product');
    likeProduct(productId);
  }
});
