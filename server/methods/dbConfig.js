'use strict';
import { Meteor } from 'meteor/meteor';
import { dbConfig } from '../../db/dbConfig';

Meteor.publish('dbConfig', function () {
  return dbConfig.find();
});
