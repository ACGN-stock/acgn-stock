import prerenderNode from 'prerender-node';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

Meteor.startup(() => {
  prerenderNode.set('protocol', 'https');
  prerenderNode.set('prerenderServiceUrl', getPrerenderServer());
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

function getPrerenderServer() {
  let { url, port } = Meteor.settings.public.prerenderServer;

  if (url.indexOf('/', url.length - 1) !== -1) {
    url = url.slice(0, -1);
  }

  if (port && port !== 80) {
    port = `:${port}`;
  }
  else {
    port = '';
  }

  return `${url}${port}/`;
}
