import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';

let lastQueryInstantMessageTime = Date.now() - 60000;
const rInstantMessageList = new ReactiveVar([]);
const rDontInterrupt = new ReactiveVar(false);
Meteor.setInterval(queryInstantMessage, 5000);
function queryInstantMessage() {
  if (rDontInterrupt.get()) {
    return false;
  }
  if (shouldStopSubscribe()) {
    return false;
  }
  Meteor.call('queryInstantMessage', lastQueryInstantMessageTime, (error, result) => {
    if (! error) {
      lastQueryInstantMessageTime = result.lastTime || (Date.now() - 60000);
      const oldMessageList = rInstantMessageList.get();
      const oldMessageIdList = _.pluck(oldMessageList, '_id');
      const listResult = _.chain(result.list)
        .sortBy('createdAt')
        .reverse()
        .map((message) => {
          message.createdAt = new Date(message.createdAt);

          return message;
        })
        .reject((message) => {
          return _.contains(oldMessageIdList, message._id);
        })
        .value();

      rInstantMessageList.set(listResult.concat(oldMessageList));
    }
  });
}
Template.instantMessage.helpers({
  isDontInterruptButtonClass() {
    return rDontInterrupt.get()
      ? 'btn btn-sm btn-warning mr-1' : 'btn btn-sm btn-secondary mr-1';
  }
});
Template.instantMessage.events({
  'click [data-action="clearMessage"]'(event) {
    event.preventDefault();
    rInstantMessageList.set([]);
  },
  'click [data-action="dontInterrupt"]'(event) {
    event.preventDefault();
    rDontInterrupt.set(! rDontInterrupt.get());
  }
});

Template.instantMessageChatForm.onRendered(function() {
  this.$message = this.$('[name="message"]');
});
Template.instantMessageChatForm.events({
  submit(event, templateInstance) {
    event.preventDefault();
    const message = templateInstance.$message.val();
    if (message.length > 255) {
      alertDialog.alert('輸入訊息過長！');
    }
    else if (message.length) {
      Meteor.customCall('instantMessageChat', message, () => {
        templateInstance.$message.val('');
      });
    }
  }
});

// 不能篩掉、永遠顯示的紀錄類別
const alwaysDisplayLogTypeList = [
  '發薪紀錄',
  '舉報違規',
  '禁止舉報',
  '禁止下單',
  '禁止聊天',
  '禁止廣告',
  '禁止簡介',
  '課以罰款',
  '金管撤單',
  '沒收股份',
  '清除簡介',
  '禁任經理',
  '解除舉報',
  '解除下單',
  '解除聊天',
  '解除廣告',
  '解除簡介',
  '退還罰款',
  '解除禁任',
  '查封關停',
  '解除查封',
  '產品下架',
  '撤銷廣告'
];
// 篩選器可以選擇的紀錄類別
const messageTypeGroupHash = {
  '聊天發言': [
    '聊天發言'
  ],
  '交易相關': [
    '交易紀錄',
    '購買下單',
    '販賣下單',
    '取消下單',
    '公司釋股'
  ],
  '新創相關': [
    '公司復活',
    '創立公司',
    '參與投資',
    '創立失敗',
    '創立成功'
  ],
  '競選相關': [
    '參選紀錄',
    '就任經理',
    '辭職紀錄',
    '撤職紀錄',
    '支持紀錄'
  ],
  '經理管理': [
    '經理管理'
  ],
  '推薦產品': [
    '推薦產品'
  ],
  '最萌亂鬥': [
    '亂鬥報名',
    '亂鬥加強',
    '亂鬥營利'
  ]
};
const defaultFilterValue = _.chain(messageTypeGroupHash)
  .flatten()
  .values()
  .value()
  .concat(alwaysDisplayLogTypeList);
const rFilterTypeList = new ReactiveVar(defaultFilterValue);
Template.instantMessageFilterButton.helpers({
  btnClass() {
    const btnType = this.type;
    const messageTypeList = messageTypeGroupHash[btnType] || [btnType];
    if (_.contains(rFilterTypeList.get(), messageTypeList[0])) {
      return 'btn btn-sm btn-primary';
    }
    else {
      return 'btn btn-sm btn-secondary';
    }
  },
  btnText() {
    return this.type;
  }
});
Template.instantMessageFilterButton.events({
  'click'(event, templateInstance) {
    event.preventDefault();
    const btnType = templateInstance.data.type;
    const messageTypeList = messageTypeGroupHash[btnType] || [btnType];
    const previousFilterTypeList = rFilterTypeList.get();
    if (_.intersection(previousFilterTypeList, messageTypeList).length > 0) {
      rFilterTypeList.set(_.difference(previousFilterTypeList, messageTypeList));
    }
    else {
      rFilterTypeList.set(_.union(previousFilterTypeList, messageTypeList));
    }
  }
});

const rFilterUserId = new ReactiveVar([]);
const rFilterCompanyId = new ReactiveVar([]);
Template.instantMessageFilterById.helpers({
  filterUserId() {
    return rFilterUserId.get();
  },
  filterCompanyId() {
    return rFilterCompanyId.get();
  }
});
Template.instantMessageFilterById.events({
  'click [data-action="filterUserId"]'(event) {
    event.preventDefault();
    alertDialog.dialog({
      type: 'prompt',
      title: '篩選使用者',
      message: `
        <div>請輸入使用者識別碼：</div>
        <div><small class="text-info">使用者識別碼可以在帳號資訊頁面的網址列中取得。</small></div>
        <div><small>http://acgn-stock.com/accountInfo/<span class="text-danger">識別碼</span></small></div>
      `,
      defaultValue: '',
      callback: function(userId) {
        if (userId) {
          const newFilterUserId = _.union(rFilterUserId.get(), userId);
          rFilterUserId.set(newFilterUserId);
          const newFilterTypeList = _.union(rFilterTypeList.get(), ['只看指定使用者或公司']);
          rFilterTypeList.set(newFilterTypeList);
        }
      }
    });
  },
  'click [data-action="filterCompanyId"]'(event) {
    event.preventDefault();
    alertDialog.dialog({
      type: 'prompt',
      title: '篩選公司',
      message: `
        <div>請輸入公司識別碼：</div>
        <div><small class="text-info">使用者識別碼可以在公司細節頁面的網址列中取得。</small></div>
        <div><small>http://acgn-stock.com/company/detail/<span class="text-danger">識別碼</span></small></div>
      `,
      defaultValue: '',
      callback: function(companyId) {
        if (companyId) {
          const newFilterCompanyId = _.union(rFilterCompanyId.get(), companyId);
          rFilterCompanyId.set(newFilterCompanyId);
          const newFilterTypeList = _.union(rFilterTypeList.get(), ['只看指定使用者或公司']);
          rFilterTypeList.set(newFilterTypeList);
        }
      }
    });
  },
  'click [data-action="filterFavorite"]'(event) {
    event.preventDefault();
    const user = Meteor.user();
    if (user) {
      const newFilterCompanyId = _.union(rFilterCompanyId.get(), user.favorite);
      rFilterCompanyId.set(newFilterCompanyId);
      const newFilterTypeList = _.union(rFilterTypeList.get(), ['只看指定使用者或公司']);
      rFilterTypeList.set(newFilterTypeList);
    }
  }
});

Template.instantMessageFilterByUserId.events({
  'click [data-action="remove"]'(event, templateInstance) {
    const newFilterUserId = _.without(rFilterUserId.get(), templateInstance.data);
    rFilterUserId.set(newFilterUserId);
  }
});
Template.instantMessageFilterByCompanyId.events({
  'click [data-action="remove"]'(event, templateInstance) {
    const newFilterCompanyId = _.without(rFilterCompanyId.get(), templateInstance.data);
    rFilterCompanyId.set(newFilterCompanyId);
  }
});

Template.instantMessageList.helpers({
  logList() {
    const user = Meteor.user();
    const userId = user ? user._id : '';
    const filterTypeList = rFilterTypeList.get();
    const displayLogList = _.filter(rInstantMessageList.get(), (logData) => {
      // 發布給所有使用者的紀錄一定要顯示
      if (logData.userId === '!all') {
        return true;
      }
      // 登入使用者自身有關的紀錄一定要顯示
      if (userId && logData.userId && _.contains(logData.userId, userId)) {
        return true;
      }
      // 如果有點擊「只看指定使用者或公司」篩選按鈕
      if (_.contains(filterTypeList, '只看指定使用者或公司')) {
        const filterUserId = rFilterUserId.get();
        const filterCompanyId = rFilterCompanyId.get();

        // 只顯示按鈕篩選器有啟動的訊息且有相符使用者識別碼或公司識別碼的紀錄
        return _.contains(filterTypeList, logData.logType) && (
          (logData.userId && _.intersection(filterUserId, logData.userId).length > 0) ||
          logData.companyId && _.contains(filterCompanyId, logData.companyId)
        );
      }

      // 只顯示按鈕篩選器有啟動的紀錄
      return _.contains(filterTypeList, logData.logType);
    });

    return displayLogList;
  }
});
