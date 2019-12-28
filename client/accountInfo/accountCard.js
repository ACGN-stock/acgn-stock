import { Template } from 'meteor/templating';
import { hasRole } from '/db/users';

Template.accountCard.helpers({
  cardDisplayClass(user) {
    if (hasRole(user, 'superAdmin')) {
      return 'account-card-super-admin';
    }
    if (hasRole(user, 'generalManager')) {
      return 'account-card-general-manager';
    }
    if (hasRole(user, 'developer')) {
      return 'account-card-developer';
    }
    if (hasRole(user, 'planner')) {
      return 'account-card-planner';
    }
    if (hasRole(user, 'fscMember')) {
      return 'account-card-fsc';
    }

    return 'account-card-default';
  }
});
