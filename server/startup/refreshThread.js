import { Meteor } from 'meteor/meteor';
import { refreshThread } from '/server/imports/threading/thread';

Meteor.startup(function() {
  refreshThread();
  // 定期更新thread回報時間與當前連線數量
  Meteor.setInterval(refreshThread, 15000);
});
