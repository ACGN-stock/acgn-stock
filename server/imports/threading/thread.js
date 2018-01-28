import { UserStatus } from 'meteor/mizzao:user-status';

import { dbThreads } from '/db/dbThreads';

export const threadId = (process.env.GALAXY_CONTAINER_ID || '') + '!' + process.pid;

export function refreshThread() {
  // 定期更新thread回報時間與當前連線數量
  if (dbThreads.find(threadId).count() > 0) {
    dbThreads.update(threadId, {
      $set: {
        connections: UserStatus.connections.find().count(),
        refreshTime: new Date()
      }
    });
  }
  else {
    dbThreads.insert({
      _id: threadId,
      doIntervalWork: false,
      refreshTime: new Date(),
      connections: UserStatus.connections.find().count()
    });
  }
}

export function findIntervalWorkThreadId() {
  // 先移除所有一分鐘未更新的thread資料
  dbThreads.remove({ refreshTime: { $lt: new Date(Date.now() - 60000) } });
  // 如果現在沒有負責intervalWork的thread
  if (dbThreads.find({ doIntervalWork: true }).count() < 1) {
    // 將第一個thread指派為負責intervalWork工作
    dbThreads.update({}, { $set: { doIntervalWork: true } });
  }

  // 取出負責intervalWork的thread資料
  const threadData = dbThreads.findOne({ doIntervalWork: true });

  return threadData ? threadData._id : null;
}
