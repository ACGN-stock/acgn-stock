'use strict';
import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { DocHead } from 'meteor/kadira:dochead';
import { dbCompanies } from './db/dbCompanies';
import { dbFoundations } from './db/dbFoundations';
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
  companyList: '股市總覽',
  foundationList: '新創計劃',
  advertising: '廣告宣傳',
  productCenterBySeason: '產品中心',
  productCenterByCompany: '產品中心',
  seasonalReport: '季度報告',
  accountInfo: '帳號資訊',
  accuseRecord: '舉報違規紀錄'
};

FlowRouter.route('/instantMessage', {
  name: 'instantMessage',
  action() {
    DocHead.setTitle(config.websiteName + ' - 即時訊息');
  }
});

const companyRoute = FlowRouter.group({
  prefix: '/company',
  name: 'companyRoute'
});
companyRoute.route('/', {
  name: 'companyListRedirect',
  triggersEnter: [
    (context, redirect) => {
      redirect('/company/1');
    }
  ]
});
companyRoute.route('/:page', {
  name: 'companyList',
  action(params) {
    DocHead.setTitle(config.websiteName + ' - 股市總覽');
    if (Meteor.isClient) {
      const { rCompanyOffset } = require('./client/company/companyList');
      const page = window.parseInt(params.page, 10);
      const offset = (page - 1) * 12;
      rCompanyOffset.set(offset);
    }
  }
});
companyRoute.route('/detail/:companyId', {
  name: 'companyDetail',
  action(params) {
    if (Meteor.isServer) {
      const companyData = dbCompanies.findOne(params.companyId, {
        fields: {
          companyName: 1
        }
      });
      DocHead.setTitle(config.websiteName + ' - 「' + companyData.companyName + '」公司資訊');
    }
    else {
      DocHead.setTitle(config.websiteName + ' - 公司資訊');
    }
  }
});
FlowRouter.route('/edit/:companyId', {
  name: 'editCompany',
  action() {
    DocHead.setTitle(config.websiteName + ' - 經營管理');
  }
});

const foundationRoute = FlowRouter.group({
  prefix: '/foundation',
  name: 'foundationRoute'
});
foundationRoute.route('/', {
  name: 'foundationRedirect',
  triggersEnter: [
    (context, redirect) => {
      redirect('/foundation/1');
    }
  ]
});
foundationRoute.route('/:page', {
  name: 'foundationList',
  action(params) {
    DocHead.setTitle(config.websiteName + ' - 新創計劃');
    if (Meteor.isClient) {
      const { rFoundationOffset } = require('./client/foundation/foundationList');
      const page = window.parseInt(params.page, 10);
      const offset = (page - 1) * 12;
      rFoundationOffset.set(offset);
    }
  }
});
foundationRoute.route('/view/:foundationId', {
  name: 'foundationDetail',
  action(params) {
    if (Meteor.isServer) {
      const foundationData = dbFoundations.findOne(params.foundationId, {
        fields: {
          companyName: 1
        }
      });
      DocHead.setTitle(config.websiteName + ' - 「' + foundationData.companyName + '」公司資訊');
    }
    else {
      DocHead.setTitle(config.websiteName + ' - 新創計劃資訊');
    }
  }
});
foundationRoute.route('/edit/new', {
  name: 'createFoundationPlan',
  action() {
    DocHead.setTitle(config.websiteName + ' - 發起新創計劃');
  }
});
foundationRoute.route('/edit/:foundationId', {
  name: 'editFoundationPlan',
  action() {
    if (Meteor.isClient) {
      DocHead.setTitle(config.websiteName + ' - 編輯新創計劃');
    }
  }
});

const productCenterRoute = FlowRouter.group({
  prefix: '/productCenter',
  name: 'productCenterRoute'
});
productCenterRoute.route('/season/:seasonId', {
  name: 'productCenterBySeason',
  action() {
    DocHead.setTitle(config.websiteName + ' - 產品中心');
  }
});
productCenterRoute.route('/company/:companyId', {
  name: 'productCenterByCompany',
  action(params) {
    if (Meteor.isServer) {
      const companyData = dbCompanies.findOne(params.companyId, {
        fields: {
          companyName: 1
        }
      });
      DocHead.setTitle(config.websiteName + ' - 產品中心 - ' + companyData.companyName);
    }
    else {
      DocHead.setTitle(config.websiteName + ' - 產品中心');
    }
  }
});

FlowRouter.route('/advertising', {
  name: 'advertising',
  action() {
    DocHead.setTitle(config.websiteName + ' - 廣告宣傳');
  }
});

const seasonalReportRoute = FlowRouter.group({
  prefix: '/seasonalReport',
  name: 'seasonalReportRoute'
});
seasonalReportRoute.route('/', {
  name: 'seasonalReportRedirect',
  action() {
    DocHead.setTitle(config.websiteName + ' - 季度報告');
  }
});
seasonalReportRoute.route('/:seasonId', {
  name: 'seasonalReport',
  action() {
    DocHead.setTitle(config.websiteName + ' - 季度報告');
  }
});

const accountInfoRoute = FlowRouter.group({
  prefix: '/accountInfo',
  name: 'accountInfoRoute'
});
accountInfoRoute.route('/', {
  name: 'accountInfo',
  triggersEnter: [
    (context, redirect) => {
      if (Meteor.isClient) {
        const user = Meteor.user();
        if (user) {
          redirect('/accountInfo/' + user._id);
        }
      }
    }
  ]
});
accountInfoRoute.route('/:userId', {
  name: 'accountInfo',
  action(params) {
    if (Meteor.isServer) {
      const user = Meteor.users.findOne(params.userId, {
        fields: {
          'profile.name': 1
        }
      });
      DocHead.setTitle(config.websiteName + ' - 「' + user.profile.name + '」帳號資訊');
    }
    else {
      DocHead.setTitle(config.websiteName + ' - 帳號資訊');
    }
  }
});

FlowRouter.route('/accuseRecord', {
  name: 'accuseRecord',
  action() {
    DocHead.setTitle(config.websiteName + ' - 舉報違規紀錄');
  }
});
