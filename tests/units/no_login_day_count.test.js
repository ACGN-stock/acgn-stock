import test from 'tape';
import deepequal from 'deep-equal';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { dbSeason } from '/db/dbSeason';
import { loginObserver } from '/server/imports/utils/loginObserver';

test('No login day computaion test', function(t) {
  const stubCursor = new Mongo.Cursors();

  dbSeason.findOne.returns({ beginDate: new Date(2017, 1, 1, 10, 0) });
  Meteor.users.find.returns(stubCursor);
  Meteor.users.update.callsFake(function(id, info) {
    if (id !== 'FOOBAR')
      t.fail('Try to update with incorrect id');
    if (! deepequal(info, {
      $inc: {
        'profile.noLoginDayCount': 1
      }
    }, { strict: true }))
      t.fail('Try to update with incorrect no login day computation');
  });

  loginObserver.start();

  stubCursor.observe.yieldTo('changed', {
    _id: 'FOOBAR',
    status: {
      lastLogin: {
        date: new Date(2017, 1, 4, 10, 0),
        ipAddr: '0.0.0.0'
      }
    }
  }, {
    _id: 'FOOBAR',
    status: {
      lastLogin: {
        date: new Date(2017, 1, 2, 10, 0),
        ipAddr: '0.0.0.0'
      }
    }
  });

  t.pass('The no login day computation is correct');

  t.end();
});
