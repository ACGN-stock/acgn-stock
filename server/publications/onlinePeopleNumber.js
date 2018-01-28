import { Meteor } from 'meteor/meteor';

import { dbThreads } from '/db/dbThreads';
import { debug } from '/server/imports/utils/debug';
import { limitSubscription } from '/server/imports/utils/rateLimit';

Meteor.publish('onlinePeopleNumber', function() {
  debug.log('publish onlinePeopleNumber');
  let onlinePeopleNumber = 0;
  dbThreads.find().forEach((threadData) => {
    onlinePeopleNumber += threadData.connections;
  });
  this.added('variables', 'onlinePeopleNumber', {
    value: onlinePeopleNumber
  });
  const intervalId = Meteor.setInterval(() => {
    countAndPublishOnlinePeopleNumber(this);
  }, 10000);

  this.ready();
  this.onStop(() => {
    Meteor.clearInterval(intervalId);
  });
});
// 一分鐘最多重複訂閱5次
limitSubscription('onlinePeopleNumber', 5);
function countAndPublishOnlinePeopleNumber(publisher) {
  debug.log('countAndPublishOnlinePeopleNumber');
  let onlinePeopleNumber = 0;
  dbThreads.find().forEach((threadData) => {
    onlinePeopleNumber += threadData.connections;
  });
  publisher.changed('variables', 'onlinePeopleNumber', {
    value: onlinePeopleNumber
  });
}
