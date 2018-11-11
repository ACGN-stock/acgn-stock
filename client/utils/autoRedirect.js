import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

// 自動轉為ssl protocol
if (Meteor.isProduction && Meteor.settings.public.debugMode === false && location.protocol === 'http:') {
  location.href = location.href.replace('http:', 'https:');
}

// 自動根據domain name轉port
_.each(Meteor.settings.public.autoRedirectDomainPortSettings, (domain, port) => {
  if (location.hostname === domain && location.port !== port) {
    location.port = port;
  }
});
