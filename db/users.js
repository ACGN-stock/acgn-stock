'use strict';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

const schema = new SimpleSchema({
  username: {
    type: String,
    regEx: /^[0-9a-zA-Z]{4,}$/
  },
  emails: {
    type: Array,
    optional: true
  },
  'emails.$': {
    type: Object
  },
  'emails.$.address': {
    type: String,
    regEx: SimpleSchema.RegEx.Email
  },
  'emails.$.verified': {
    type: Boolean
  },
  createdAt: {
    type: Date
  },
  profile: {
    type: Object,
    optional: true
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
    min: 0
  },
  vote: {
    type: SimpleSchema.Integer,
    min: 0
  }
});
Meteor.users.attachSchema(schema);
