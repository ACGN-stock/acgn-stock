'use strict';
import { _ } from 'meteor/underscore';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { config } from './config';

//basic route
FlowRouter.route('/', {
  name: 'tutorial',
  action() {
    document.title = config.websiteName + ' - 教學導覽';
  }
});

export const pageNameHash = {
  instantMessage: '即時訊息',
  stockSummary: '股市總覽',
  foundationPlan: '新創計劃',
  productCenter: '產品中心',
  seasonalReport: '季度報告',
  accountQuery: '帳號查詢',
  accuseRecord: '舉報紀錄'
};

_.each(pageNameHash, (pageName, pageKey) => {
  FlowRouter.route('/' + pageKey, {
    name: pageKey,
    action() {
      document.title = config.websiteName + ' - ' + pageName;
    }
  });
});
