'use strict';
import { FlowRouter } from 'meteor/kadira:flow-router';

// export const linkNameHash = {
//   personalInfo: '個人資訊',
//   financialManage: '財務管理',
//   instantMessage: '即時訊息',
//   stockSummary: '股市總覽',
//   productCenter: '產品中心',
//   seasonalReport: '季度報告',
//   stockQuery: '查詢上市公司',
//   userQuery: '查詢使用者'
// };

//basic route
FlowRouter.route('/', {
  name: 'index'
});
