'use strict';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { dbInstantMessage } from '../db/dbInstantMessage';

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
    time: new Date(),
    type: '即時聊天',
    source: user.username,
    message: message
  });
}
