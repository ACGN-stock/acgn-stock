import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbProducts } from '/db/dbProducts';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { voteProduct, adminEditProduct, banProduct } from '../utils/methods';

inheritedShowLoadingOnSubscribing(Template.productCenterByCompany);
const rProductSortBy = new ReactiveVar('voteCount');
const rProductSortDir = new ReactiveVar(-1);
const rProductOffset = new ReactiveVar(0);
Template.productCenterByCompany.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('productListByCompany', {
        companyId: companyId,
        sortBy: rProductSortBy.get(),
        sortDir: rProductSortDir.get(),
        offset: rProductOffset.get()
      });
      if (Meteor.user()) {
        this.subscribe('currentUserVoteRecord', companyId);
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
  'click [data-vote-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-vote-product');
    voteProduct(productId);
  },
  'click [data-ban-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-ban-product');
    banProduct(productId);
  },
  'click [data-edit-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-edit-product');
    adminEditProduct(productId);
  }
});
