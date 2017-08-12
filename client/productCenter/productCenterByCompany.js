'use strict';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbDirectors } from '../../db/dbDirectors';
import { dbProducts } from '../../db/dbProducts';
import { dbProductLike } from '../../db/dbProductLike';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';

inheritedShowLoadingOnSubscribing(Template.productCenterByCompany);
const rProductSortBy = new ReactiveVar('likeCount');
const rProductSortDir = new ReactiveVar(-1);
const rProductOffset = new ReactiveVar(0);
Template.productCenterByCompany.onCreated(function() {
  this.autorun(() => {
    if (Meteor.user()) {
      this.subscribe('queryOwnStocks');
    }
  });
  this.autorun(() => {
    const companyName = FlowRouter.getParam('companyName');
    if (companyName) {
      this.subscribe('productListByCompany', {
        companyName: companyName,
        sortBy: rProductSortBy.get(),
        sortDir: rProductSortDir.get(),
        offset: rProductOffset.get()
      });
      if (Meteor.user()) {
        this.subscribe('queryMyLike', companyName);
      }
    }
  });
});
Template.productCenterByCompany.helpers({
  companyName() {
    return FlowRouter.getParam('companyName');
  }
});

Template.productListByCompanyTable.helpers({
  productList() {
    const companyName = FlowRouter.getParam('companyName');

    return dbProducts.find(
      {
        companyName: companyName
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
    const user = Meteor.user();
    if (! user) {
      window.alert('您尚未登入，無法向產品作出股東評價！');

      return false;
    }
    const companyName = FlowRouter.getParam('companyName');
    const username = user.username;
    if (dbDirectors.find({companyName, username}).count() < 1) {
      window.alert('您至少需要擁有一張「' + companyName + '」的股票才可對公司產品做出股東評價！');

      return false;
    }
    const productId = $(event.currentTarget).attr('data-like-product');
    if (dbProductLike.find({productId, username}).count() > 0) {
      if (window.confirm('您已經對此產品做出過正面評價，要收回評價嗎？')) {
        Meteor.call('likeProduct', productId);
      }
    }
    else {
      Meteor.call('likeProduct', productId);
    }
  }
});
