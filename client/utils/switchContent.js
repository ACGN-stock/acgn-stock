import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

Template.switchContent.onCreated(function() {
  this.selectedView = new ReactiveVar();

  this.data.views.forEach((view) => {
    if (view.default) {
      this.selectedView.set(view);
    }
  });
});

Template.switchContent.helpers({
  contentTemplateName() {
    const templateInstance = Template.instance();
    const { templatePrefix } = templateInstance.data;

    const selectedView = templateInstance.selectedView.get();

    if (selectedView) {
      return `${templatePrefix}${selectedView.name}`;
    }
  },
  activeIfViewSelected(viewName) {
    const templateInstance = Template.instance();
    const selectedView = templateInstance.selectedView.get();

    if (selectedView && selectedView.name === viewName) {
      return 'active';
    }
  }
});

Template.switchContent.events({
  'click [data-view]'(event, templateInstance) {
    event.preventDefault();
    const viewName = $(event.currentTarget).attr('data-view');
    const { views } = templateInstance.data;
    templateInstance.selectedView.set(_.findWhere(views, { name: viewName }));
  }
});
