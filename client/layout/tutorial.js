import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.tutorial.onCreated(function() {
  this.subscribe('fscMembers');
});

Template.tutorial.events({
  'click .card-header.pointer'(event) {
    $(event.currentTarget)
      .next('.collapse')
      .toggleClass('show');
  }
});

Template.tutorial.helpers({
  fscMembers() {
    return _.pluck(Meteor.users.find({ 'profile.roles': 'fscMember' }, { sort: { createdAt: 1 } }).fetch(), '_id');
  }
});
