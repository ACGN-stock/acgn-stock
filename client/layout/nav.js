'use strict';
import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { controller } from './controller';

const navLinkHash = {
  personalInfo: '個人資訊',
  stockSummary: '股市總覽',
  stockQuery: '股票查詢',
  accountQuery: '帳號查詢',
  productCenter: '產品中心',
  seasonalReport: '季度報告'
};
const navLinkList = _.keys(navLinkHash);

const navLinkListCollapsed = new ReactiveVar(true);
Template.nav.helpers({
  getNavLinkListClassList() {
    if (navLinkListCollapsed.get()) {
      return 'collapse navbar-collapse';
    }
    else {
      return 'collapse navbar-collapse show';
    }
  },
  navLinkList() {
    return navLinkList;
  }
});
Template.nav.events({
  'click button'() {
    navLinkListCollapsed.set(! navLinkListCollapsed.get());
  }
});

Template.navLink.helpers({
  getClassList() {
    return 'nav-item' + (controller.currentPage === this.data ? ' active' : '');
  },
  getLinkText() {
    return navLinkHash[this.data];
  }
});
Template.navLink.events({
  click(event, templateInstance) {
    event.preventDefault();
    controller.currentPage = templateInstance.data.data;
  }
});
