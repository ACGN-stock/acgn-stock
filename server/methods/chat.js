'use strict';
import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { dbInstantMessage } from '../../db/dbInstantMessage';

Meteor.methods({
  chat(message) {
    check(this.userId, String);
    check(message, String);
    chat(Meteor.user(), message);

    return true;
  }
});

function chat(user, message) {
  dbInstantMessage.insert({
    type: '即時聊天',
    createdAt: new Date(),
    source: user.username,
    message: message
  });
}

Meteor.publish('instantMessage', function() {
  const user = this.userId ? Meteor.users.findOne(this.userId) : null;
  const username = user ? user.username : '';
  dbInstantMessage.find({
    createdAt: {
      $gte: new Date( Date.now() - 60000 )
    }
  }).observeChanges({
    added: (id, fields) => {
      if (username && fields.onlyForUsers.length > 0 && _.contains(fields.onlyForUsers, username) === false) {
        return false;
      }
      this.added('instantMessage', id, fields);
    }
  });
  this.ready();
});
