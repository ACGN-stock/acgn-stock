import prerender from 'prerender';
import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  const prerenderServer = prerender({ port: Meteor.settings.public.prerenderServer.port });
  prerenderServer.start();
  process.env.DISABLE_LOGGING = true;
});
