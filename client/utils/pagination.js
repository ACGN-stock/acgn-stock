'use strict';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { Template } from 'meteor/templating';
import { dbVariables } from '../../db/dbVariables';

Template.pagination.helpers({
  haveData() {
    const totalCount = dbVariables.get(this.useVariableForTotalCount);

    return totalCount > this.dataNumberPerPage;
  },
  pages() {
    const totalCount = dbVariables.get(this.useVariableForTotalCount);
    const totalPages = Math.ceil(totalCount / this.dataNumberPerPage);
    if (totalPages <= 7) {
      return _.range(1, totalPages + 1);
    }
    else {
      const offset = this.offset.get();
      const currentPage = (offset / this.dataNumberPerPage) + 1;
      if (currentPage - 3 >= 1 && currentPage + 3 <= totalPages) {
        return _.range(currentPage - 3, currentPage + 4);
      }
      else if (currentPage - 3 < 1) {
        return _.range(1, 8);
      }
      else if (currentPage + 3 > totalPages) {
        return _.range(totalPages - 6, totalPages + 1);
      }
    }
  },
  currentPage() {
    const offset = this.offset.get();

    return (offset / this.dataNumberPerPage) + 1;
  },
  totalPages() {
    const totalCount = dbVariables.get(this.useVariableForTotalCount);

    return Math.ceil(totalCount / this.dataNumberPerPage);
  },
  pageItemClass(page) {
    const offset = this.offset.get();
    const currentPage = (offset / this.dataNumberPerPage) + 1;

    return (page === currentPage) ? 'page-item active' : 'page-item';
  },
  pageLinkHref(page) {
    const templateInstance = Template.instance();
    const data = templateInstance.data;
    const totalCount = dbVariables.get(data.useVariableForTotalCount);
    const totalPages = Math.ceil(totalCount / data.dataNumberPerPage);

    if (page === 'end') {
      return './' + totalPages;
    }

    const offset = this.offset.get();
    const currentPage = (offset / this.dataNumberPerPage) + 1;
    if (page === 'prev') {
      return './' + Math.max(1, currentPage - 1);
    }
    if (page === 'next') {
      return './' + Math.min(totalPages, currentPage + 1);
    }

    return './' + page;
  }
});
Template.pagination.events({
  'click a[href]'(event, templateInstance) {
    const data = templateInstance.data;
    if (! data.useHrefRoute) {
      event.preventDefault();
      const href = $(event.currentTarget).attr('href');
      const toPage = parseInt(href.slice(2), 10);
      const newOffset = (toPage - 1) * data.dataNumberPerPage;
      data.offset.set(newOffset);
    }
  },
  'submit form'(event, templateInstance) {
    event.preventDefault();

    const data = templateInstance.data;
    const targetPage = Number(templateInstance.$('form')
      .find('input[name=page]')
      .val());

    if (data.useHrefRoute) {
      FlowRouter.go(FlowRouter.path(FlowRouter.getRouteName(), { page: targetPage }));
    }
    else {
      const newOffset = (targetPage - 1) * data.dataNumberPerPage;
      data.offset.set(newOffset);
    }
  },
  'click form button'(event) {
    event.stopPropagation(); // 防止與外層的 click button 事件衝突 (e.g., 帳號資訊 > 玩家紀錄 > 金管會相關紀錄按鍵)
  }
});
