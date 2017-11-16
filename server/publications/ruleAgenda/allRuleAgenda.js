import { Meteor } from 'meteor/meteor';

import { dbRuleAgendas } from '/db/dbRuleAgendas';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.publish('allRuleAgenda', function() {
  debug.log('publish allRuleAgenda');

  return dbRuleAgendas.find({}, { disableOplog: true });
});
//一分鐘最多重複訂閱5次
limitSubscription('allRuleAgenda', 5);
