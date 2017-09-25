'use strict';
import { Meteor } from 'meteor/meteor';
import { UserStatus } from 'meteor/mizzao:user-status';
import { dbThreads } from '../db/dbThreads';

export const threadId = (process.env.GALAXY_CONTAINER_ID || '') + '!' + process.pid;

Meteor.startup(function() {
  dbThreads.insert({
    _id: threadId,
    doIntervalWork: false,
    refreshTime: new Date(),
    connections: 0
  });
  //定期更新thread回報時間與當前連線數量
  Meteor.setInterval(refreshThread, 15000);
});

function refreshThread() {
  //定期更新thread回報時間與當前連線數量
  dbThreads.update(threadId, {
    $set: {
      connections: UserStatus.connections.find().count(),
      refreshTime: new Date()
    }
  });
}
