
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { isCurrentUser, paramUserId, paramUser } from './helpers';

inheritedShowLoadingOnSubscribing(Template.editAccount);

Template.editAccount.onCreated(function() {
  this.selectedView = new ReactiveVar();

  this.getUser = () => {
    if (! this.subscriptionsReady()) {
      return;
    }

    return paramUser();
  };

  this.autorunWithIdleSupport(() => {
    if (isCurrentUser()) {
      // TODO 建立專用的 publish
      this.subscribe('accountInfo', paramUserId());
    }
  });
});

Template.editAccount.helpers({
  user() {
    return Template.instance().getUser();
  },
  userAbout() {
    const { _id, about } = Template.instance().getUser();

    return { _id, ...about };
  }
});
