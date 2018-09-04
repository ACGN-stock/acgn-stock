import { Meteor } from 'meteor/meteor';

if (Meteor.isProduction && Meteor.settings.public.debugMode === false && location.protocol === 'http:') {
  location.href = location.href.replace('http:', 'https:');
}