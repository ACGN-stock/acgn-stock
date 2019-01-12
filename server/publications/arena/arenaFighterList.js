import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbArenaFighters, arenaFighterSortableFields } from '/db/dbArenaFighters';
import { limitSubscription } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';
import { publishWithScope } from '/server/imports/utils/publishWithScope';
import { Counts } from 'meteor/tmeasday:publish-counts';

Meteor.publish('arenaFighterList', function({ arenaId, offset, sortBy, sortDir }) {
  debug.log('publish arenaFighterList', arenaId);
  check(arenaId, String);
  check(offset, Match.Integer);
  check(sortBy, new Match.OneOf(...arenaFighterSortableFields));
  check(sortDir, new Match.OneOf(1, -1));

  Counts.publish(this, 'arenaFighterList', dbArenaFighters.find({ arenaId }), { noReady: true });

  publishWithScope(this, {
    collection: 'arenaFighters',
    scope: 'list',
    cursor: dbArenaFighters.find({ arenaId }, {
      sort: { [sortBy]: sortDir },
      fields: {
        arenaId: 1,
        companyId: 1,
        manager: 1,
        totalInvestedAmount: 1,
        rank: 1,
        hp: 1,
        sp: 1,
        atk: 1,
        def: 1,
        agi: 1,
        createdAt: 1
      },
      skip: offset,
      limit: Meteor.settings.public.dataNumberPerPage.arenaFighterList,
      disableOplog: true
    })
  });

  this.ready();
});
// 一分鐘最多20次
limitSubscription('arenaFighterList');
