'use strict';
import SimpleSchema from 'simpl-schema';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbFoundations } from '../../db/dbFoundations';
import { inheritUtilForm, utilFormHelpers, handleInputChange as inheritedHandleInputChange } from '../utils/form';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { shouldStopSubscribe } from '../utils/idle';

const rIssueList = new ReactiveVar();
const rIssueOptionList = new ReactiveVar();

Template.createRuleAgenda.helpers({
  defaultData() {
    return {
      agendaTitle: '',
      description: ''
    };
  }
});

inheritUtilForm(Template.ruleAgendaForm);
Template.ruleAgendaForm.onCreated(function() {
  this.validateModel = validateModel;
  this.handleInputChange = handleInputChange;
  this.saveModel = saveModel;
  rIssueList.set(defaultIssueList());
  rIssueOptionList.set(defaultIssueOptionList());
});

Template.ruleAgendaForm.helpers({
  getIssueInputName: getIssueInputName,
  getIssueInputMultipleName: getIssueInputMultipleName,
  getIssueOptionInputName: getIssueOptionInputName,
  getIssueList() {
    return rIssueList.get();
  },
  getIssueTypeText(issue) {
    return issue.multiple ? '多選' : '單選';
  },
  getIssueOptionList(issueId) {
    const optionList = rIssueOptionList.get();
    return optionList[issueId - 1];
  },
  showRemoveIssueButton() {
    return rIssueList.get().length > 1;
  },
  showRemoveOptionButton(issueId) {
    const list = rIssueOptionList.get();
    if (!list[issueId - 1]) {
      return false;
    }

    return list[issueId - 1].length > 2;
  },
  errorHtmlOfIssueInput(issueId) {
    return utilFormHelpers.errorHtmlOf(getIssueInputName(issueId));
  },
  errorHtmlOfIssueOptionInput(issueId, optionId) {
    return utilFormHelpers.errorHtmlOf(getIssueOptionInputName(issueId, optionId));
  }
});

Template.ruleAgendaForm.events({
  'click [data-action="addIssue"]'(event) {
    event.preventDefault();
    const issueList = rIssueList.get();
    issueList.push({
      id: issueList.length + 1,
      multiple: false
    });
    rIssueList.set(issueList);
    const optionList = rIssueOptionList.get();
    optionList.push([{ id: 1 }, { id: 2 }]);
    rIssueOptionList.set(optionList);
  },
  'click [data-action="removeIssue"]'(event) {
    event.preventDefault();
    const issueList = rIssueList.get();
    issueList.pop();
    rIssueList.set(issueList);
    const optionList = rIssueOptionList.get();
    optionList.pop();
    rIssueOptionList.set(optionList);
  },
  'click [data-add-option]'(event) {
    event.preventDefault();
    const issueId = $(event.currentTarget).attr('data-add-option') - 1;
    const optionList = rIssueOptionList.get();
    optionList[issueId].push({
      id: optionList[issueId].length + 1
    });
    rIssueOptionList.set(optionList);
  },
  'click [data-remove-option]'(event) {
    event.preventDefault();
    const issueId = $(event.currentTarget).attr('data-remove-option') - 1;
    const optionList = rIssueOptionList.get();
    optionList[issueId].pop();
    rIssueOptionList.set(optionList);
  },
  'click [data-toggle-multiple]'(event) {
    event.preventDefault();
    const issueId = $(event.currentTarget).attr('data-toggle-multiple') - 1;
    const list = rIssueList.get();
    list[issueId].multiple = ! list[issueId].multiple;
    rIssueList.set(list);
  }
});

function defaultIssueOptionList() {
  return [[{ id: 1 }, { id: 2 }]];
};

function defaultIssueList() {
  return [{ id: 1, multiple: false }];
};

function getIssueInputName(issueId) {
  return 'issue-' + issueId;
};

function getIssueInputMultipleName(issueId) {
  return 'issue-multiple-' + issueId;
};

function getIssueOptionInputName(issueId, optionId) {
  return 'option-' + issueId + '-' + optionId;
};

function validateModel(model) {
  const error = {};
  if (! model.agendaTitle.length) {
    error.agendaTitle = '請輸入議程主題！';
  }
  else if (model.agendaTitle.length > 100) {
    error.agendaTitle = '議程主題字數過長！';
  }
  if (model.discussionUrl) {
    if (! SimpleSchema.RegEx.Url.test(model.discussionUrl)) {
      error.discussionUrl = '連結格式錯誤！';
    }
  }
  else {
    error.discussionUrl = '請輸入議程討論連結！';
  }
  if (model.description.length < 10) {
    error.description = '介紹文字過少！';
  }

  const issueList = rIssueList.get();
  issueList.forEach((issue, index) => {
    const issueKey = getIssueInputName(index + 1)
    const title = model[issueKey];
    if (! model[issueKey] || ! model[issueKey].length) {
      error[issueKey] = '請輸入議題名稱！';
    }

    const optionList = rIssueOptionList.get()[index];
    optionList.forEach((option, optionIndex) => {
      const optionKey = getIssueOptionInputName(index + 1, optionIndex + 1);
      if (! model[optionKey] || ! model[optionKey].length) {
        error[optionKey] = '請輸入選項！';
      }
    });
  });

  if (_.size(error) > 0) {
    return error;
  }
}

function handleInputChange(event) {
  inheritedHandleInputChange.call(this, event);
}

function saveModel(model) {
  const message = '議程送出後不可再修改且直接開放投票72小時，確認是否送出？';
  alertDialog.confirm(message, function(result) {
    if (result) {
      const issues = [];
      const issueList = rIssueList.get();
      issueList.forEach((issue, index) => {
        const title = model[getIssueInputName(index + 1)];
        const multiple = issue.multiple;

        const options = [];
        const optionList = rIssueOptionList.get()[index];
        optionList.forEach((option, optionIndex) => {
          options.push(model[getIssueOptionInputName(index + 1, optionIndex + 1)]);
        });

        issues.push({
          title: title,
          multiple: multiple,
          options: options
        });
      });

      const newModel = {
        title: model.agendaTitle,
        description: model.description,
        discussionUrl: model.discussionUrl,
        issues: issues
      };

      // Meteor.customCall('createAgenda', newModel, (error) => {
      //   if (! error) {
      //     const path = FlowRouter.path('ruleDiscuss');
      //     FlowRouter.go(path);
      //   }
      // });
    }
  });
}
