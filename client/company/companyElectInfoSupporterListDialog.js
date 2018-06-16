import { Template } from 'meteor/templating';

Template.companyElectInfoSupporterListDialog.events({
  'click [data-action="dismiss"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.data.onDismiss();
  }
});
