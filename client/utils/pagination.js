'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';

const dbPagination = new Mongo.Collection('pagination');

Template.pagination.helpers({
  haveData() {
    const subscribeData = dbPagination.findOne(this.subscribe);

    return subscribeData ? (subscribeData.total > this.dataNumberPerPage) : false;
  },
  pages() {
    const subscribeData = dbPagination.findOne(this.subscribe);
    const totalPages = Math.ceil(subscribeData.total / this.dataNumberPerPage);

    return _.range(1, totalPages + 1);
  },
  pageItemClass(page) {
    const offset = this.offset.get();
    const currentPage = (offset / this.dataNumberPerPage) + 1;

    return (page === currentPage) ? 'page-item active' : 'page-item';
  }
});
Template.pagination.events({
  'click a[href]'(event, templateInstance) {
    event.preventDefault();
    const href = $(event.currentTarget).attr('href');
    const toPage = parseInt(href, 10);
    const newOffset = (toPage - 1) * this.dataNumberPerPage;
    templateInstance.data.offset.set(newOffset);
  }
});
