'use strict';
import { Template } from 'meteor/templating';
import { dbResourceLock } from '../../db/dbResourceLock';
import { dbVariables } from '../../db/dbVariables';

Template.footer.onCreated(function() {
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    this.subscribe('onlinePeopleNumber');
  });
});
Template.footer.helpers({
  onlinePeopleNumber() {
    return dbVariables.get('onlinePeopleNumber');
  }
});
