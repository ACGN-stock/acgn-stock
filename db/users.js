'use strict';
import { Meteor } from 'meteor/meteor';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const schema = new SimpleSchema({
  username: {
    type: String,
    regEx: /^[0-9a-zA-Z]{4,}$/
  },
  createdAt: {
    type: Date
  },
  services: {
    type: Object,
    optional: true,
    blackbox: true
  },
  heartbeat: {
    type: Date,
    optional: true
  },
  wealth: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0
  },
  vote: {
    type: SimpleSchema.Integer,
    min: 0,
    defaultValue: 0
  }
});
Meteor.users.attachSchema(schema);
