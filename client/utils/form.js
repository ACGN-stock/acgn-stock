import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { alertDialog } from '../layout/alertDialog';

export function handleInputChange(event) {
  const $input = $(event.currentTarget);
  const name = $input.attr('name');
  const value = $input.val();
  const model = this.model.get();
  model[name] = value;
  this.model.set(model);
}

export function handleModelError(error) {
  alertDialog.alert('輸入有錯誤，請修正');
  this.error.set(error);
}

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
    this.model.set(this.data || {});

    this.autorun(() => {
      // 移除所有先前的表單 error 樣式
      this.$('[name]')
        .closest('.form-group')
        .removeClass('has-danger')
        .removeAttr('title');

      const error = this.error.get();

      if (! error) {
        return;
      }

      // 顯示表單 error 樣式
      Object.entries(error).forEach(([key, message]) => {
        this.$(`[name="${key}"]`)
          .closest('.form-group')
          .addClass('has-danger')
          .attr('title', message);
      });
    });
  });

  template.helpers({
    valueOf(fieldName) {
      return Template.instance().model.get()[fieldName];
    },
    errorHtmlOf(fieldName) {
      const templateInstance = Template.instance();
      const error = templateInstance.error.get() || {};
      const errorMessage = error[fieldName];

      return errorMessage ? `<div class="form-control-feedback">${errorMessage}</div>` : '';
    }
  });

  template.events({
    'click [for], touchstart [for]'(event, templateInstance) {
      const forFieldName = $(event.currentTarget).attr('for');
      templateInstance.$(`[name="${forFieldName}"]`).trigger('focus');
    },
    'change [name]'(event, templateInstance) {
      templateInstance.handleInputChange(event);
    },
    reset(event, templateInstance) {
      event.preventDefault();
      templateInstance.model.set(templateInstance.data || {});
    },
    submit(event, templateInstance) {
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
  });
}
