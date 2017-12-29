import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';

export const accountInfoCommonHelpers = {
  isCurrentUser() {
    const user = Meteor.user();
    if (user && user._id === FlowRouter.getParam('userId')) {
      return true;
    }

    return false;
  }
};
