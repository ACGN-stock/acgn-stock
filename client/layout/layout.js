'use strict';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

Template.layout.helpers({
  currentPage() {
    return FlowRouter.getRouteName();
  }
});

