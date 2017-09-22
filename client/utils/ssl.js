'use strict';
import { Meteor } from 'meteor/meteor';

if (Meteor.isProduction && location.protocol === 'http:') {
  location.href = location.href.replace('http:', 'https:');
}
