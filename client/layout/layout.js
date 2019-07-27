import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { DocHead } from 'meteor/kadira:dochead';

import { rMainTheme } from '/client/utils/styles';
import { updatePathToGA } from '/client/utils/googleAnalytics/updatePathToGA';
import { getCurrentPage, getCurrentPageFullTitle } from '/routes';
import { rAccountDialogMode } from './accountDialog';
import { rShowAlertDialog, alertDialog } from './alertDialog';

Template.layout.onRendered(function() {
  this.autorun(() => {
    FlowRouter.watchPathChange();
    DocHead.setTitle(getCurrentPageFullTitle());
    updatePathToGA();
  });
});

Template.layout.helpers({
  currentPage: getCurrentPage,
  showAccountDialog() {
    return rAccountDialogMode.get() && ! Meteor.user();
  },
  showAlertDialog() {
    return rShowAlertDialog.get();
  },
  containerClass() {
    if (rMainTheme.get() === 'light') {
      return 'container container-light';
    }

    return 'container container-dark';
  }
});

Template.layout.events({
  'click a'(event) {
    const target = event.currentTarget;

    if (target.hostname && target.hostname !== location.hostname) {
      if (localStorage.getItem('no-more-warning')) {
        return;
      }

      event.preventDefault();
      const message = `
        <div class="row">
          <div class="col-12">
            <div class="text-danger font-weight-bold">即將開啟外部連結，請確認</div>
          </div>
          <div class="col-12 mt-1">
            <input type="checkbox" name="no-more-warning">
            <label for="no-more-warning">不再顯示類似警告</label>
          </div>
        </div>
      `;

      alertDialog.confirm({
        message,
        callback: (result) => {
          const templateInstance = Template.instance();
          const checked = templateInstance.$('input[name="no-more-warning"]').prop('checked');

          if (checked) {
            localStorage.setItem('no-more-warning', true);
          }
          if (result) {
            window.open(target.href, '_blank');
          }
        }
      });
    }
  }
});
