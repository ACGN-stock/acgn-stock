import prerenderNode from 'prerender-node';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';

Meteor.startup(() => {
  prerenderNode.set('protocol', 'https');
  prerenderNode.set('prerenderServiceUrl', getPrerenderServer());
  WebApp.rawConnectHandlers.use(prerenderNode);
});

function getPrerenderServer() {
  const { url, port } = Meteor.settings.public.prerenderServer;

  return `${url}${port ? `:${port}` : ''}/`;
}
