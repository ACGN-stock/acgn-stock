'use strict';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { dbInstantMessage } from '../../db/dbInstantMessage';

Template.instantMessageChatForm.onRendered(function() {
  this.$message = this.$('[name="message"]');
});
Template.instantMessageChatForm.events({
  submit(event, templateInstance) {
    event.preventDefault();
    const message = templateInstance.$message.val();
    if (message) {
      Meteor.call('instantMessageChat', message, () => {
        templateInstance.$message.val('');
      });
    }
  }
});

Template.instantMessageList.onCreated(function() {
  if (Meteor.userId()) {
    this.subscribe('instantMessage');
  }
});
Template.instantMessageList.helpers({
  messageList() {
    return dbInstantMessage.find({}, {
      sort: {
        createdAt: -1
      }
    });
  },
  getTypeHtml(instantMessageData) {
    switch (instantMessageData.type) {
      case '聊天發言': {
        return '使用者' + instantMessageData.source + '說：';
      }
      default: {
        return '【' + instantMessageData.type + '】';
      }
    }
  }
});
