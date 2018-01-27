import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';

export function paramUserId() {
  return FlowRouter.getParam('userId');
}

export function paramUser() {
  const userId = paramUserId();

  return userId ? Meteor.users.findOne(userId) : null;
}

export function isCurrentUser() {
  const currentUserId = Meteor.userId();
  if (currentUserId && currentUserId === paramUserId()) {
    return true;
  }
}

export const accountInfoCommonHelpers = {
  paramUserId,
  paramUser,
  isCurrentUser
};
