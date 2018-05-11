import { Template } from 'meteor/templating';

import { canCreateAnnouncement } from './helpers';

Template.createAnnouncement.helpers({
  canCreateAnnouncement
});
