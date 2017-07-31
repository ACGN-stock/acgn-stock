'use strict';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { DocHead } from 'meteor/kadira:dochead';
import { config } from './config';

//basic route
FlowRouter.route('/', {
  name: 'tutorial',
  action() {
    DocHead.setTitle(config.websiteName + ' - 教學導覽');
  }
});

export const pageNameHash = {
  instantMessage: '即時訊息',
  stockSummary: '股市總覽',
  foundationPlan: '新創計劃',
  productCenter: '產品中心',
  seasonalReport: '季度報告',
  accountInfo: '帳號資訊',
  accuseRecord: '舉報紀錄'
};

FlowRouter.route('/instantMessage', {
  name: 'instantMessage',
  action() {
    DocHead.setTitle(config.websiteName + ' - 即時訊息');
  }
});
FlowRouter.route('/stockSummary', {
  name: 'stockSummary',
  action() {
    DocHead.setTitle(config.websiteName + ' - 股市總覽');
  }
});
FlowRouter.route('/company/:companyName', {
  name: 'company',
  action(params) {
    DocHead.setTitle(config.websiteName + ' - 「' + params.companyName + '」公司資訊');
  }
});
FlowRouter.route('/manageCompany/:companyName', {
  name: 'manageCompany',
  action() {
    DocHead.setTitle(config.websiteName + ' - 經營管理');
  }
});
FlowRouter.route('/foundationPlan', {
  name: 'foundationPlan',
  action() {
    DocHead.setTitle(config.websiteName + ' - 新創計劃');
  }
});
FlowRouter.route('/foundCompany', {
  name: 'createFoundationPlan',
  action() {
    DocHead.setTitle(document.title = config.websiteName + ' - 發起新創計劃');
  }
});
// FlowRouter.route('/foundCompany/:foundationId', {
//   name: 'editFoundationPlan',
//   action() {
//     if (Meteor.isClient) {
//       document.title = config.websiteName + ' - 編輯新創計劃';
//     }
//   }
// });
FlowRouter.route('/productCenter', {
  name: 'productCenter',
  action() {
    DocHead.setTitle(document.title = config.websiteName + ' - 產品中心');
  }
});
FlowRouter.route('/seasonalReport', {
  name: 'seasonalReport',
  action() {
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 季度報告';
    }
  }
});
FlowRouter.route('/accountInfo', {
  name: 'accountInfo',
  action() {
    DocHead.setTitle(config.websiteName + ' - 帳號資訊');
    if (Meteor.isClient) {
      const { rSearchUsername } = require('./client/accountInfo/accountInfo');
      rSearchUsername.set('');
    }
  }
});
FlowRouter.route('/accountInfo/:username', {
  name: 'accountInfo',
  action(params) {
    DocHead.setTitle(config.websiteName + ' - 「' + params.username + '」帳號資訊');
    if (Meteor.isClient) {
      const { rSearchUsername } = require('./client/accountInfo/accountInfo');
      rSearchUsername.set(params.username);
    }
  }
});
FlowRouter.route('/accuseRecord', {
  name: 'accuseRecord',
  action() {
    DocHead.setTitle(config.websiteName + ' - 舉報紀錄');
  }
});
