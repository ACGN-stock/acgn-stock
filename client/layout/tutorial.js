'use strict';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';

Template.tutorial.events({
  'click .card-header.pointer'(event) {
    $(event.currentTarget)
      .next('.collapse')
      .toggleClass('show');
  }
});
