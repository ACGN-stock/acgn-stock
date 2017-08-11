'use strict';
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { dbInstantMessage } from '../../db/dbInstantMessage';

Meteor.methods({
  instantMessageChat(message) {
    check(this.userId, String);
    check(message, String);
    const userId = this.userId;
    const username = Meteor.users.findOne(userId).username;
    dbInstantMessage.insert({
      type: '聊天發言',
      createdAt: new Date(),
      onlyForUsers: [],
      source: username,
      message: message
    });
  }
});

Meteor.publish('instantMessage', function() {
  let username = false;
  if (this.userId) {
    const user = Meteor.users.findOne(this.userId, {
      fields: {
        username: 1
      }
    });
    username = user.username;
  }
  const observer = dbInstantMessage
    .find({
      createdAt: {
        $gte: new Date( Date.now() - 60000 )
      }
    })
    .observeChanges({
      added: (id, fields) => {
        if (fields.onlyForUsers.length > 0 && ! (username && _.contains(fields.onlyForUsers, username))) {
          return false;
        }
        this.added('instantMessage', id, fields);
      }
    });
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
