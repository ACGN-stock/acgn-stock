import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/percolate:migrations';

import { dbThreads } from '/db/dbThreads';
import { findIntervalWorkThreadId, refreshThread, threadId } from '/server/imports/threading/thread';

import '/server/imports/migrations';

dbThreads.remove({}); // NOTE: server 關閉後會存留有上次的 threads 資訊，需將之清除

Meteor.startup(() => {
  // NOTE: 多執行緒的狀況下需確保只有一個執行緒會進行 migration 與資料初始化，目前暫時使用 workerThread 進行
  refreshThread();
  if (findIntervalWorkThreadId() === threadId) {
    console.log('prepareDatabase: run migrations...');
    Migrations.migrateTo('latest');

    console.log('prepareDatabase: generate initial data...');
    require('/server/imports/fixtures');

    console.log('prepareDatabase: done.');
  }
});
