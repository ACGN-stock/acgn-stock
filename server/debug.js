'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { config } from '../config';

export const debug = new Mongo.Collection('debugTemporary');
export const dbDebugCrash = new Mongo.Collection('debugCrash');

function log(work, detail) {
  const time = new Date();
  debug.insert({work, detail, time});
}
function clean() {
  debug.remove({});
}
if (config.debugMode) {
  debug.log = log;
  debug.clean = clean;
  Meteor.startup(function() {
    const crashTime = new Date();
    //everytime start server, insert dbDebugTemporary into dbDebugCrash
    debug.find().forEach((doc) => {
      doc = _.omit(doc, '_id');
      doc.crashTime = crashTime;
      dbDebugCrash.insert(doc);
    });
  });
}
else {
  debug.log = _.identity;
  debug.clean = _.identity;
}
