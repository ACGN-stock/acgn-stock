import { Template } from 'meteor/templating';

Template.violatorDisplay.helpers({
  isViolatorType(type) {
    return Template.currentData().violatorType === type;
  }
});
