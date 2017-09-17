'use strict';
import { Tracker } from 'meteor/tracker';
import { UserStatus } from 'meteor/mizzao:user-status';
import { TimeSync } from 'meteor/mizzao:timesync';
import { dbResourceLock } from '../../db/dbResourceLock';

Tracker.autorun(function() {
  if (TimeSync.isSynced() && ! UserStatus.isMonitoring()) {
    UserStatus.startMonitor({
      threshold: 300000,
      interval: 10000,
      idleOnBlur: false
    });
  }
});

export function shouldStopSubscribe() {
  if (UserStatus.isIdle()) {
    return true;
  }
  if (dbResourceLock.find('season').count()) {
    return true;
  }

  return false;
}
