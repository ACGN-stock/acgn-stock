'use strict';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { config } from './config';

//basic route
FlowRouter.route('/', {
  name: 'tutorial',
  action() {
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 教學導覽';
    }
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
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 即時訊息';
    }
  }
});
FlowRouter.route('/stockSummary', {
  name: 'stockSummary',
  action() {
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 股市總覽';
    }
  }
});
FlowRouter.route('/company/:companyName', {
  name: 'company',
  action(params) {
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 「' + params.companyName + '」公司資訊';
    }
  }
});
FlowRouter.route('/foundationPlan', {
  name: 'foundationPlan',
  action() {
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 新創計劃';
    }
  }
});
FlowRouter.route('/foundCompany', {
  name: 'createFoundationPlan',
  action() {
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 發起新創計劃';
    }
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
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 產品中心';
    }
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
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 即時訊息';
      document.title = config.websiteName + ' - ' + pageNameHash.accountInfo;
      const { rSearchUsername } = require('./client/accountInfo/accountInfo');
      rSearchUsername.set('');
    }
  }
});
FlowRouter.route('/accountInfo/:username', {
  name: 'accountInfo',
  action(params) {
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 「' + params.username + '」帳號資訊';
      const { rSearchUsername } = require('./client/accountInfo/accountInfo');
      rSearchUsername.set(params.username);
    }
  }
});
FlowRouter.route('/accuseRecord', {
  name: 'accuseRecord',
  action() {
    if (Meteor.isClient) {
      document.title = config.websiteName + ' - 舉報紀錄';
    }
  }
});
