import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

export const rShowAlertDialog = new ReactiveVar(false);
let strAlertDialogTitle = '';
let strAlertDialogMessage = '';
let strAlertDialogDefaultValue = null;
let strAlertDialogType = 'alert';
let strAlertDialogInputType = 'text';
let strAlertDialogCustomSetting = '';
let funcAlertDialogCallback = null;
let blAlertDialogOK = false;

export const alertDialog = {
  dialog(options) {
    strAlertDialogType = options.type;
    strAlertDialogTitle = options.title;
    strAlertDialogMessage = options.message;
    strAlertDialogInputType = options.inputType || 'text';
    strAlertDialogDefaultValue = options.defaultValue || null;
    strAlertDialogCustomSetting = options.customSetting || '';
    funcAlertDialogCallback = options.callback;
    blAlertDialogOK = false;
    rShowAlertDialog.set(true);
  },
  alert(options) {
    const defaultOption = {
      type: 'alert',
      title: ''
    };

    if (typeof options === 'string') {
      defaultOption.message = options;
      options = {};
    }

    Object.assign(defaultOption, options);
    this.dialog(defaultOption);
  },
  confirm(options) {
    const defaultOption = {
      type: 'confirm',
      title: ''
    };

    Object.assign(defaultOption, options);
    this.dialog(defaultOption);
  },
  prompt: function(options) {
    const defaultOption = {
      type: 'prompt',
      title: ''
    };

    Object.assign(defaultOption, options);
    this.dialog(defaultOption);
  }
};

Template.alertDialog.onRendered(function() {
  const $form = this.$('form');
  if (strAlertDialogType === 'prompt') {
    $form
      .find('input, textarea')
      .first()
      .trigger('focus');
  }
  else {
    $form
      .find('button:last')
      .trigger('focus');
  }

  $(document).on('keydown.alertDialog', (e) => {
    if (e.which === 13 && strAlertDialogInputType !== 'multilineText') {
      $form.trigger('submit');
    }
    else if (e.which === 27) {
      $form.trigger('reset');
    }
  });
});
Template.alertDialog.onDestroyed(function() {
  $(document).off('keydown.alertDialog');

  const callback = funcAlertDialogCallback;
  const ok = blAlertDialogOK;
  if (strAlertDialogType === 'prompt') {
    const value = this.$('input, textarea').val();
    this.$('input, textarea').val('');
    if (callback) {
      callback(ok && value);
    }
  }
  else if (callback) {
    callback(ok);
  }
});
Template.alertDialog.helpers({
  customInput() {
    if (strAlertDialogInputType === 'multilineText') {
      return `
        <textarea name="alert-dialog-custom-input" class="form-control" rows="5"
          ${strAlertDialogCustomSetting}>${strAlertDialogDefaultValue || ''}</textarea>
      `;
    }

    return `
      <input name="alert-dialog-custom-input" class="form-control"
             type="${strAlertDialogInputType}"
             value="${(strAlertDialogDefaultValue === null) ? '' : strAlertDialogDefaultValue}"
             ${strAlertDialogCustomSetting} />
    `;
  },
  alertDialogTitle() {
    return strAlertDialogTitle;
  },
  alertDialogMessage() {
    return strAlertDialogMessage;
  },
  showTitle() {
    return strAlertDialogTitle.length > 0;
  },
  showInput() {
    return strAlertDialogType === 'prompt';
  },
  showCancelButton() {
    return strAlertDialogType !== 'alert';
  }
});
Template.alertDialog.events({
  'click [for], touchstart [for]'(event, templateInstance) {
    const forFieldName = $(event.currentTarget).attr('for');
    const $inputTarget = $(templateInstance.find(`[name="${forFieldName}"]`));

    $inputTarget.trigger('focus');
  },
  reset(event) {
    event.preventDefault();
    blAlertDialogOK = false;
    rShowAlertDialog.set(false);
  },
  submit(event) {
    event.preventDefault();
    blAlertDialogOK = true;
    rShowAlertDialog.set(false);
  }
});
