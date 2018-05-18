import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

const checkedIconClass = 'fa fa-check-square-o';
const uncheckedIconClass = 'fa fa-square-o';

Template.checkableButton.onCreated(function() {
  this.isChecked = new ReactiveVar();
  this.onChangedCallback = this.data.onChanged || $.noop;

  this.autorun(() => {
    this.isChecked.set(Template.currentData().checked);
  });
});

Template.checkableButton.helpers({
  iconClass() {
    return Template.instance().isChecked.get() ? checkedIconClass : uncheckedIconClass;
  },
  buttonClass() {
    return Template.currentData().class || '';
  }
});

Template.checkableButton.events({
  'click a'(event, templateInstance) {
    event.preventDefault();
    templateInstance.isChecked.set(! templateInstance.isChecked.get());
    templateInstance.onChangedCallback(templateInstance.isChecked.get());
  }
});
