import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { categoryDisplayName, categoryMap, dbViolationCases } from '/db/dbViolationCases';
import { inheritUtilForm } from '../utils/form';
import { alertDialog } from '../layout/alertDialog';
import { markdown } from '../utils/helpers';

const formModelSchema = dbViolationCases.simpleSchema().pick('category', 'description');

inheritUtilForm(Template.violationCaseForm);

Template.violationCaseForm.onCreated(function() {
  const oldHandleInputChange = this.handleInputChange;

  this.handleInputChange = (event) => {
    const input = this.$(event.currentTarget);
    const name = input.attr('name');
    const value = input.val();
    const valueChanged = value !== this.model.get()[name];

    if (name === 'category' && valueChanged) {
      const { descriptionTemplate } = categoryMap[value] || {};
      this.$('[name="description"]').val(descriptionTemplate).change();
    }

    return oldHandleInputChange.call(this, event);
  };

  this.validateModel = (model) => {
    const error = {};

    const cleanedModel = formModelSchema.clean(model);

    if (! cleanedModel.category) {
      error.category = '請選擇違規類型！';
    }

    if (! cleanedModel.description) {
      error.description = '違規描述不得為空！';
    }
    else if (cleanedModel.description.length < formModelSchema.get('description', 'min')) {
      error.description = `違規描述最短需 ${formModelSchema.get('description', 'min')} 字！`;
    }
    else if (cleanedModel.description.length > formModelSchema.get('description', 'max')) {
      error.description = `違規描述最長不得超過 ${formModelSchema.get('description', 'max')} 字！`;
    }

    if (_.size(error) > 0) {
      return error;
    }
  };

  this.saveModel = (model) => {
    const cleanedModel = formModelSchema.clean(model);

    alertDialog.confirm({
      title: '送出違規案件',
      message: `
        案件一旦送出即無法收回，確定要送出嗎？<br>
        若是濫用違規舉報機制，將可能被處以<span class="text-danger">停權</span>，請特別注意。
      `,
      callback: (result) => {
        if (! result) {
          return;
        }

        const methodArgs = {
          ...cleanedModel,
          violator: model.violator
        };

        Meteor.customCall('reportViolation', methodArgs, (error) => {
          if (! error) {
            FlowRouter.go('violationCaseList');
          }
        });
      }
    });
  };

  this.setError = (fieldName, reason) => {
    this.error.set({
      ...(this.error.get() || {}),
      [fieldName]: reason
    });
  };

  this.unsetError = (fieldName) => {
    const error = this.error.get();

    if (! error) {
      return;
    }

    delete error[fieldName];
    this.error.set(error);
  };
});

Template.violationCaseForm.events({
  'keyup [name="description"]': _.debounce(function(event, templateInstance) {
    event.preventDefault();
    templateInstance.handleInputChange(event);
  }, 250)
});

Template.violationCaseForm.helpers({
  categoryDisplayName,
  violationCaseCategories() {
    const { violatorType } = Template.instance().model.get().violator || {};

    if (! violatorType) {
      return [];
    }

    return Object.entries(categoryMap).filter(([, { allowedInitialViolatorTypes } ]) => {
      return ! allowedInitialViolatorTypes || allowedInitialViolatorTypes.includes(violatorType);
    }).map(([category]) => {
      return category;
    });
  },
  descriptionPreview() {
    return markdown(Template.instance().model.get().description || '');
  },
  violator() {
    return Template.instance().model.get().violator;
  }
});
