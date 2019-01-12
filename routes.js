import { FlowRouter } from 'meteor/kadira:flow-router';

export const pageNameHash = {
  mainPage: '首頁',
  announcementList: '系統公告',
  tutorial: '遊戲規則',
  instantMessage: '即時訊息',
  companyList: '股市總覽',
  foundationList: '新創計劃',
  advertising: '廣告宣傳',
  productCenterBySeason: '產品中心',
  productCenterByCompany: '產品中心',
  arenaInfo: '最萌亂鬥大賽',
  seasonalReport: '季度報告',
  accountInfo: '帳號資訊',
  ruleAgendaList: '規則討論',
  violationCaseList: '違規案件列表',
  fscLogs: '金管會執行紀錄',
  fscStock: '金管會持股'
};

FlowRouter.route('/', { name: 'mainPage' });

const announcementRoute = FlowRouter.group({ prefix: '/announcement' });
announcementRoute.route('/', { name: 'announcementList' });
announcementRoute.route('/view/:announcementId', { name: 'announcementDetail' });
announcementRoute.route('/new', { name: 'createAnnouncement' });
announcementRoute.route('/reject/:announcementId', { name: 'rejectAnnouncement' });

const violationRoute = FlowRouter.group({ prefix: '/violation' });
violationRoute.route('/', { name: 'violationCaseList' });
violationRoute.route('/report', { name: 'reportViolation' });
violationRoute.route('/view/:violationCaseId', { name: 'violationCaseDetail' });

FlowRouter.route('/fscLogs', { name: 'fscLogs' });

FlowRouter.route('/fscStock', { name: 'fscStock' });

FlowRouter.route('/tutorial', { name: 'tutorial' });

FlowRouter.route('/instantMessage', { name: 'instantMessage' });

const companyRoute = FlowRouter.group({ prefix: '/company' });
companyRoute.route('/:page?', { name: 'companyList' });
companyRoute.route('/detail/:companyId', { name: 'companyDetail' });
companyRoute.route('/edit/:companyId', { name: 'editCompany' });

const foundationRoute = FlowRouter.group({ prefix: '/foundation' });
foundationRoute.route('/new', { name: 'createFoundationPlan' });
foundationRoute.route('/:page?', { name: 'foundationList' });
foundationRoute.route('/view/:foundationId', { name: 'foundationDetail' });
foundationRoute.route('/edit/:foundationId', { name: 'editFoundationPlan' });

const productCenterRoute = FlowRouter.group({ prefix: '/productCenter' });
productCenterRoute.route('/season/:seasonId', { name: 'productCenterBySeason' });
productCenterRoute.route('/company/:companyId', { name: 'productCenterByCompany' });

FlowRouter.route('/advertising', { name: 'advertising' });

FlowRouter.route('/arenaInfo/:arenaId?', { name: 'arenaInfo' });

FlowRouter.route('/seasonalReport/:seasonId?', { name: 'seasonalReport' });

FlowRouter.route('/accountInfo/:userId?', { name: 'accountInfo' });

const ruleDiscussRoute = FlowRouter.group({ prefix: '/ruleDiscuss' });
ruleDiscussRoute.route('/', { name: 'ruleAgendaList' });
ruleDiscussRoute.route('/new', { name: 'createRuleAgenda' });
ruleDiscussRoute.route('/view/:agendaId', { name: 'ruleAgendaDetail' });
ruleDiscussRoute.route('/vote/:agendaId', { name: 'ruleAgendaVote' });

const controlCenterRoute = FlowRouter.group({ prefix: '/controlCenter' });
controlCenterRoute.route('/sendGift', { name: 'controlCenterSendGift' });
