import { Template } from 'meteor/templating';

import {
  controlCenterPageDisplayName,
  getAccessibleControlCenterPageKeys,
  pathForControlCenterPage
} from '/client/controlCenter/helpers';

Template.controlCenterNavLinkGroup.helpers({
  getAccessibleControlCenterPageKeys,
  controlCenterPageDisplayName,
  pathForControlCenterPage
});
