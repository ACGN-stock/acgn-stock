'use strict';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

export function inheritUtilForm(template) {
  template.onCreated(function() {
    this.validateModel = $.noop;
    this.handleInputChange = handleInputChange;
    this.handleModelError = handleModelError;
    this.saveModel = $.noop;
    this.error = new ReactiveVar(null);
    this.model = new ReactiveVar({});
  });
  template.onRendered(function() {
    this.$input = this.$('[name]');
    this.model.set(this.data);
  });
  template.helpers(utilFormHelpers);
  template.events(utilFormEvents);
}

export function handleInputChange(event) {
  const $input = $(event.currentTarget);
  const name = $input.attr('name');
  const value = $input.val();
  const model = this.model.get();
  model[name] = value;
  this.model.set(model);
}

export function handleModelError(error) {
  this.error.set(error);
}

export const utilFormHelpers = {
  valueOf(fieldName) {
    const templateInstance = Template.instance();

    return templateInstance.model.get()[fieldName];
  },
  errorHtmlOf(fieldName) {
    const templateInstance = Template.instance();
    if (templateInstance.error && templateInstance.error.get()) {
      const errorMessage = templateInstance.error.get()[fieldName];

      if (errorMessage) {
        templateInstance.$input.filter(`[name="${fieldName}"]`)
          .closest('.form-group')
          .addClass('has-danger')
          .attr('title', errorMessage);

        return `
          <div class="form-control-feedback">
            ${errorMessage}
          </div>
        `;
      }
      else {
        templateInstance.$input.filter(`[name="${fieldName}"]`)
          .closest('.form-group')
          .removeClass('has-danger')
          .removeAttr('title');

        return '';
      }
    }
  }
};
const utilFormEvents = {
  'click [for]'(event, templateInstance) {
    const forFieldName = $(event.currentTarget).attr('for');
    templateInstance.$input.filter(`[name="${forFieldName}"]`)
      .trigger('focus');
  },
  'change [name]'(event, templateInstance) {
    templateInstance.handleInputChange(event);
  },
  reset(event, templateInstance) {
    event.preventDefault();
    templateInstance.model.set(templateInstance.data);
  },
  'submit'(event, templateInstance) {
    event.preventDefault();
    templateInstance.error.set(null);
    const model = templateInstance.model.get();
    const error = templateInstance.validateModel(model);
    if (error) {
      templateInstance.handleModelError(error);
    }
    else {
      templateInstance.saveModel(model);
    }
  }
};
