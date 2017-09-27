'use strict';
import { Meteor } from 'meteor/meteor';
import { Tracker } from 'meteor/tracker';
import { UserStatus } from 'meteor/mizzao:user-status';
import { TimeSync } from 'meteor/mizzao:timesync';
import { dbResourceLock } from '../../db/dbResourceLock';

Tracker.autorun(function() {
  if (TimeSync.isSynced() && ! UserStatus.isMonitoring()) {
    UserStatus.startMonitor({
      threshold: 600000,
      interval: 30000,
      idleOnBlur: false
    });
  }
});

Tracker.autorun(function() {
  if (UserStatus.isIdle()) {
    Meteor.disconnect();
  }
  else {
    Meteor.reconnect();
  }
});

export function shouldStopSubscribe() {
  if (! Meteor.status().connected) {
    return true;
  }
  if (dbResourceLock.find('season').count()) {
    return true;
  }

  return false;
}
