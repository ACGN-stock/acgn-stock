'use strict';
import { Template } from 'meteor/templating';
import { controller } from './controller';

Template.layout.helpers({
  currentPage() {
    return controller.currentPage;
  }
});
