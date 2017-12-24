import { Meteor } from 'meteor/meteor';

import { threadId, findIntervalWorkThreadId } from '/server/imports/threading/thread';
import { loginObserver } from '/server/imports/utils/loginObserver';
import { doIntervalWork } from '../intervalCheck';

Meteor.startup(function() {
  Meteor.setInterval(intervalCheck, Meteor.settings.public.intervalTimer);
});

function intervalCheck() {
  if (findIntervalWorkThreadId() === threadId) {
    loginObserver.start();
    doIntervalWork();
  }
  else {
    loginObserver.stop();
  }
}
