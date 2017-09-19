'use strict';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { dbRankCompanyPrice } from '../../db/dbRankCompanyPrice';
import { dbRankCompanyProfit } from '../../db/dbRankCompanyProfit';
import { dbRankCompanyValue } from '../../db/dbRankCompanyValue';
import { dbRankUserWealth } from '../../db/dbRankUserWealth';
import { dbResourceLock } from '../../db/dbResourceLock';
import { dbSeason } from '../../db/dbSeason';
import { limitSubscription } from './rateLimit';
import { debug } from '../debug';

Meteor.publish('isChangingSeason', function() {
  debug.log('publish isChangingSeason');

  return dbResourceLock.find(
    {
      _id: 'season'
    },
    {
      fields: {
        _id: 1
      }
    }
  );
});
//一分鐘最多重複訂閱5次
limitSubscription('isChangingSeason', 5);

Meteor.publish('currentSeason', function() {
  debug.log('publish currentSeason');
  const observer1 = dbSeason
    .find({}, {
      sort: {
        beginDate: -1
      },
      limit: 1,
      disableOplog: true
    })
    .observeChanges({
      added: (id) => {
        this.added('variables', 'currentSeasonId', {
          value: id
        });
      },
      removed: () => {
        this.removed('variables', 'currentSeasonId');
      }
    });
  const observer2 = dbSeason
    .find({}, {
      sort: {
        beginDate: -1
      },
      limit: 2,
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('season', id, fields);
      },
      removed: (id) => {
        this.removed('season', id);
      }
    });

  this.onStop(() => {
    observer1.stop();
    observer2.stop();
  });
  this.ready();
});
//一分鐘最多重複訂閱5次
limitSubscription('currentSeason', 5);

Meteor.publish('adjacentSeason', function(seasonId) {
  debug.log('publish adjacentSeason', seasonId);
  check(seasonId, String);

  const specificSeasonData = dbSeason.findOne(seasonId);
  if (specificSeasonData) {
    this.added('season', specificSeasonData._id, specificSeasonData);
    const specificSeasonDataBeginDate = specificSeasonData.beginDate;
    const observer1 = dbSeason
      .find(
        {
          beginDate: {
            $gt: specificSeasonDataBeginDate
          }
        },
        {
          sort: {
            beginDate: 1
          },
          limit: 1,
          disableOplog: true
        }
      )
      .observeChanges({
        added: (id, fields) => {
          this.added('season', id, fields);
        },
        removed: (id) => {
          this.removed('season', id);
        }
      });
    const observer2 = dbSeason
      .find(
        {
          beginDate: {
            $lt: specificSeasonDataBeginDate
          }
        },
        {
          sort: {
            beginDate: -1
          },
          limit: 1,
          disableOplog: true
        }
      )
      .observeChanges({
        added: (id, fields) => {
          this.added('season', id, fields);
        },
        removed: (id) => {
          this.removed('season', id);
        }
      });
    this.onStop(() => {
      observer1.stop();
      observer2.stop();
    });
  }
  this.ready();
});
//一分鐘最多重複訂閱20次
limitSubscription('adjacentSeason');

Meteor.publish('rankListBySeasonId', function(seasonId) {
  debug.log('publish rankListBySeasonId', seasonId);

  dbRankCompanyPrice.find({seasonId}).forEach((doc) => {
    this.added('rankCompanyPrice', doc._id, doc);
  });
  dbRankCompanyProfit.find({seasonId}).forEach((doc) => {
    this.added('rankCompanyProfit', doc._id, doc);
  });
  dbRankCompanyValue.find({seasonId}).forEach((doc) => {
    this.added('rankCompanyValue', doc._id, doc);
  });
  dbRankUserWealth.find({seasonId}).forEach((doc) => {
    this.added('rankUserWealth', doc._id, doc);
  });
  this.ready();
});
//一分鐘最多重複訂閱30次
limitSubscription('rankListBySeasonId', 30);
