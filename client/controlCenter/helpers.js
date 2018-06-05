import { FlowRouter } from 'meteor/kadira:flow-router';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

import { hasAnyRoles } from '/db/users';

export const controlCenterPageMap = {
  sendGift: {
    routerName: 'controlCenterSendGift',
    displayName: '發送禮物',
    allowedRoles: ['superAdmin', 'planner']
  }
};

export function controlCenterPageDisplayName(key) {
  return controlCenterPageMap[key].displayName;
}

export function canAccessControlCenterPage(key) {
  return hasAnyRoles(Meteor.user(), ...controlCenterPageMap[key].allowedRoles);
}

export function pathForControlCenterPage(key) {
  return FlowRouter.path(controlCenterPageMap[key].routerName);
}

export function getAccessibleControlCenterPageKeys() {
  const currentUser = Meteor.user();

  if (! currentUser) {
    return [];
  }

  return _.pluck(Object.entries(controlCenterPageMap).filter(([, { allowedRoles } ]) => {
    return allowedRoles && hasAnyRoles(currentUser, ...allowedRoles);
  }), 0);
}
