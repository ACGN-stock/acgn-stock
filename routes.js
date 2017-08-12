'use strict';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { DocHead } from 'meteor/kadira:dochead';
import { config } from './config';

//default route
FlowRouter.route('/', {
  name: 'tutorial',
  action() {
    DocHead.setTitle(config.websiteName + ' - 教學導覽');
  }
});

export const pageNameHash = {
  tutorial: '教學導覽',
  instantMessage: '即時訊息',
  stockSummary: '股市總覽',
  foundationPlan: '新創計劃',
  productCenterRedirect: '產品中心',
  productCenterBySeason: '產品中心',
  productCenterByCompany: '產品中心',
  seasonalReportRedirect: '季度報告',
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
    DocHead.setTitle(config.websiteName + ' - 發起新創計劃');
  }
});
FlowRouter.route('/foundCompany/:foundationId', {
  name: 'editFoundationPlan',
  action() {
    if (Meteor.isClient) {
      DocHead.setTitle(config.websiteName + ' - 編輯新創計劃');
    }
  }
});

FlowRouter.route('/productCenter', {
  name: 'productCenterRedirect',
  action() {
    DocHead.setTitle(config.websiteName + ' - 產品中心');
  }
});
FlowRouter.route('/productCenter/season/:seasonId', {
  name: 'productCenterBySeason',
  action() {
    DocHead.setTitle(config.websiteName + ' - 產品中心');
  }
});
FlowRouter.route('/productCenter/company/:companyName', {
  name: 'productCenterByCompany',
  action(params) {
    DocHead.setTitle(config.websiteName + ' - 產品中心 - ' + params.companyName);
  }
});

FlowRouter.route('/seasonalReport', {
  name: 'seasonalReportRedirect',
  action() {
    DocHead.setTitle(config.websiteName + ' - 季度報告');
  }
});
FlowRouter.route('/seasonalReport/:seasonId', {
  name: 'seasonalReport',
  action() {
    DocHead.setTitle(config.websiteName + ' - 季度報告');
  }
});

FlowRouter.route('/accountInfo', {
  name: 'accountInfo',
  triggersEnter: [
    (context, redirect) => {
      if (Meteor.isClient) {
        const user = Meteor.user();
        if (user) {
          redirect('/accountInfo/' + user.username);
        }
      }
    }
  ],
  action() {
    DocHead.setTitle(config.websiteName + ' - 查詢帳號資訊');
    if (Meteor.isClient) {
      const { rSearchUsername, logOffset, ownStocksOffset } = require('./client/accountInfo/accountInfo');
      rSearchUsername.set('');
      logOffset.set(0);
      ownStocksOffset.set(0);
    }
  }
});
FlowRouter.route('/accountInfo/:username', {
  name: 'accountInfo',
  action(params) {
    DocHead.setTitle(config.websiteName + ' - 「' + params.username + '」帳號資訊');
    if (Meteor.isClient) {
      const { rSearchUsername, logOffset, ownStocksOffset } = require('./client/accountInfo/accountInfo');
      rSearchUsername.set(params.username);
      logOffset.set(0);
      ownStocksOffset.set(0);
    }
  }
});
