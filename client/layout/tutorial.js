'use strict';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';

import { importantAccuseLogTypeList } from '/db/dbLog';

Template.tutorial.events({
  'click .card-header.pointer'(event) {
    $(event.currentTarget)
      .next('.collapse')
      .toggleClass('show');
  }
});
Template.tutorial.helpers({
  importantAccuseLogTypeList() {
    return importantAccuseLogTypeList;
  }
});
