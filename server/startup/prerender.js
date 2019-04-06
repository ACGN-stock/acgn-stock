import prerenderNode from 'prerender-node';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

Meteor.startup(() => {
  if (! Meteor.settings.public.prerender.use) {
    return;
  }

  prerenderNode.set('prerenderServiceUrl', Meteor.settings.public.prerender.url);
  prerenderNode.set('crawlerUserAgents', [
    'googlebot',
    'Yahoo! Slurp',
    'bingbot',
    'yandex',
    'baiduspider',
    'developers.google.com/+/web/snippet',
    'Applebot'
  ]);
  WebApp.rawConnectHandlers.use(prerenderNode);
});
