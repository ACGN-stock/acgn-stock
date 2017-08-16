'use strict';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { dbLog } from '../../db/dbLog';

Meteor.methods({
  instantMessageChat(message) {
    check(this.userId, String);
    check(message, String);
    const user = Meteor.users.findOne(this.userId, {
      fields: {
        username: 1
      }
    });
    const username = user.username;
    dbLog.insert({
      logType: '聊天發言',
      username: [username],
      message: message,
      resolve: false,
      createdAt: new Date()
    });
  }
});

Meteor.publish('instantMessage', function() {
  const observer = dbLog
    .find({
      createdAt: {
        $gte: new Date( Date.now() - 300000 )
      }
    })
    .observeChanges({
      added: (id, fields) => {
        this.added('log', id, fields);
      }
    });
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
