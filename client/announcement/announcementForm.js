import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { getAnnounceableCategories, categoryDisplayName, dbAnnouncements } from '/db/dbAnnouncements';
import { inheritUtilForm } from '../utils/form';
import { alertDialog } from '../layout/alertDialog';
import { markdown } from '../utils/helpers';

const formModelSchema = dbAnnouncements.simpleSchema().pick('category', 'subject', 'content');

inheritUtilForm(Template.announcementForm);
Template.announcementForm.onCreated(function() {
  this.validateModel = (model) => {
    const error = {};

    const cleanedModel = formModelSchema.clean(model);

    if (! cleanedModel.category) {
      error.category = '請選擇公告分類！';
    }

    if (cleanedModel.category === 'plannedRuleChanges') {
      const { min, max } = Meteor.settings.public.announcement[cleanedModel.category].rejectionPetition.durationDays;
      const rejectionPetitionDurationDays = parseFloat(model.rejectionPetitionDurationDays);

      if (! model.rejectionPetitionDurationDays) {
        error.rejectionPetitionDurationDays = '否決連署天數不得為空！';
      }
      else if (! Number.isInteger(rejectionPetitionDurationDays)) {
        error.rejectionPetitionDurationDays = '否決連署天數必須為整數！';
      }
      else if (model.rejectionPetitionDurationDays < min || model.rejectionPetitionDurationDays > max) {
        error.rejectionPetitionDurationDays = `否決連署天數必須介於 ${min} 至 ${max} 天之間！`;
      }
    }

    if (! cleanedModel.subject) {
      error.subject = '公告主旨不得為空！';
    }
    else if (cleanedModel.subject.length < formModelSchema.get('subject', 'min')) {
      error.subject = `公告主旨最短需為${formModelSchema.get('subject', 'min')}字！`;
    }
    else if (cleanedModel.subject.length > formModelSchema.get('subject', 'max')) {
      error.subject = `公告主旨最長不得超過 ${formModelSchema.get('subject', 'max')} 字！`;
    }

    if (! cleanedModel.content) {
      error.content = '公告內文不得為空！';
    }
    else if (cleanedModel.content.length < formModelSchema.get('content', 'min')) {
      error.content = `公告內文最短需 ${formModelSchema.get('content', 'min')} 字！`;
    }
    else if (cleanedModel.content.length > formModelSchema.get('content', 'max')) {
      error.content = `公告內文最長不得超過 ${formModelSchema.get('content', 'max')} 字！`;
    }

    if (_.size(error) > 0) {
      return error;
    }
  };

  this.saveModel = (model) => {
    const cleanedModel = formModelSchema.clean(model);

    alertDialog.confirm({
      message: '確定將公告送出嗎？',
      callback: (result) => {
        if (! result) {
          return;
        }

        const methodArgs = { data: cleanedModel };

        if (cleanedModel.category === 'plannedRuleChanges') {
          methodArgs.rejectionPetitionDurationDays = parseFloat(model.rejectionPetitionDurationDays);
        }

        Meteor.customCall('createAnnouncement', methodArgs, (error) => {
          if (! error) {
            FlowRouter.go('announcementList');
          }
        });
      }
    });
  };
});

Template.announcementForm.events({
  'keyup [name="content"]': _.debounce(function(event, templateInstance) {
    event.preventDefault();
    templateInstance.handleInputChange(event);
  }, 250)
});

Template.announcementForm.helpers({
  categoryDisplayName,
  announceableCategories() {
    return getAnnounceableCategories(Meteor.user());
  },
  contentPreview() {
    return markdown(Template.instance().model.get().content || '', { advanced: true });
  },
  showRejectionPetitionFields() {
    return Template.instance().model.get().category === 'plannedRuleChanges';
  },
  rejectionPetitionDurationDays() {
    return Meteor.settings.public.announcement[Template.instance().model.get().category].rejectionPetition.durationDays;
  }
});
