import prerender from 'prerender';
import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  if (! Meteor.settings.public.production) {
    return;
  }

  const prerenderServer = prerender({
    port: Meteor.settings.public.prerenderServer.port,
    waitAfterLastRequest: 3000
  });
  prerenderServer.start();
  process.env.DISABLE_LOGGING = true;
});
