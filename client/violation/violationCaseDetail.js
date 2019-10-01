import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';

import { stateMap, categoryDisplayName, stateDisplayName, violatorTypeDisplayName, violatorTypeList } from '/db/dbViolationCases';
import { dbLog } from '/db/dbLog';
import { dbViolationCaseActionLogs, actionMap, actionDisplayName, checkUserIdentityAndCaseState } from '/db/dbViolationCaseActionLogs';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { alertDialog } from '../layout/alertDialog';
import { markdown } from '../utils/helpers';
import { paramViolationCase, paramViolationCaseId, stateBadgeClass, pathForViolationCaseDetail } from './helpers';

const stateTransitionTextMap = {
  processing: '開始處理案件',
  rejected: '駁回案件',
  closed: '結束案件'
};

inheritedShowLoadingOnSubscribing(Template.violationCaseDetail);

Template.violationCaseDetail.onCreated(function() {
  this.associatedLogOffset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const violationCaseId = paramViolationCaseId();

    if (! violationCaseId) {
      return;
    }

    this.subscribe('violationCaseDetail', violationCaseId);
  });

  this.autorunWithIdleSupport(() => {
    const violationCaseId = paramViolationCaseId();

    if (! violationCaseId) {
      return;
    }

    const offset = this.associatedLogOffset.get();

    this.subscribe('violationCaseAssociatedLogs', { violationCaseId, offset });
  });
});

Template.violationCaseDetail.helpers({
  categoryDisplayName,
  violatorTypeDisplayName,
  actionDisplayName,
  stateDisplayName,
  stateBadgeClass,
  pathForViolationCaseDetail,
  violationCase() {
    return paramViolationCase();
  },
  violationCaseInState(...states) {
    return states.includes(paramViolationCase().state);
  },
  canExecuteAction(action) {
    try {
      checkUserIdentityAndCaseState(actionMap[action], Meteor.user(), paramViolationCase());

      return true;
    }
    catch (e) {
      return false;
    }
  },
  nextStateList() {
    return stateMap[paramViolationCase().state].nextStates || [];
  },
  validViolatorTypeList() {
    return violatorTypeList;
  },
  setStateButtonClass(state) {
    switch (state) {
      case 'processing':
        return 'btn-success';
      case 'rejected':
        return 'btn-danger';
      case 'closed':
        return 'btn-warning';
      default:
        return 'btn-secondary';
    }
  },
  setStateButtonText(state) {
    return stateTransitionTextMap[state];
  },
  actionButtonClass(action) {
    switch (action) {
      case 'acceptCase':
        return 'btn-success';
      case 'rejectCase':
        return 'btn-danger';
      case 'fscComment':
        return 'btn-primary';
      case 'informerComment':
        return 'btn-info';
      case 'violatorComment':
        return 'btn-info';
      case 'closeCase':
        return 'btn-warning';
      default:
        return 'btn-secondary';
    }
  },
  actionLogs() {
    return dbViolationCaseActionLogs.find({ violationCaseId: paramViolationCaseId() }, { sort: { executedAt: 1 } });
  },
  associatedLogs() {
    return dbLog.find({ 'data.violationCaseId': paramViolationCaseId() }, { sort: { created: -1 } });
  },
  associatedLogsPaginationData() {
    return {
      counterName: 'violationCaseAssociatedLogs',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.violationCaseAssociatedLogs,
      offset: Template.instance().associatedLogOffset
    };
  }
});

function askReasonAndConfirmAction({ actionText, confirmText = `確定要${actionText}嗎？`, reasonText = '原因', note = '' }, callback) {
  alertDialog.prompt({
    title: actionText,
    message: `請輸入${actionText}的${reasonText}：（支援 markdown 語法） ${note}`,
    inputType: 'multilineText',
    callback: (reason) => {
      if (! reason) {
        return;
      }

      alertDialog.confirm({
        title: `${actionText} - markdown 內容預覽`,
        message: `
          <div class="card">
            <div class="card-block">
              <div class="markdown-container">
                ${markdown(reason)}
              </div>
            </div>
          </div>
          <div>${confirmText}</div>
        `,
        callback: (result) => {
          if (! result) {
            return;
          }

          callback(reason);
        }
      });
    }
  });
}

Template.violationCaseDetail.events({
  'click [data-action="setState"]'(event, templateInstance) {
    event.preventDefault();

    const violationCaseId = paramViolationCaseId();
    const nextState = templateInstance.$(event.currentTarget).attr('data-next-state');
    const actionText = stateTransitionTextMap[nextState];

    askReasonAndConfirmAction({ actionText }, (reason) => {
      Meteor.customCall('setViolationCaseState', { violationCaseId, nextState, reason });
    });
  },
  'click [data-action="fscComment"]'(event) {
    event.preventDefault();

    const violationCaseId = paramViolationCaseId();

    askReasonAndConfirmAction({ actionText: '加註案件', reasonText: '內容' }, (reason) => {
      Meteor.customCall('fscCommentViolationCase', { violationCaseId, reason });
    });
  },
  'click [data-action="informerComment"]'(event) {
    event.preventDefault();

    const violationCaseId = paramViolationCaseId();

    askReasonAndConfirmAction({ actionText: '增加說明', reasonText: '內容', note: '（在金管會再次處理前，僅能說明一次）' }, (reason) => {
      Meteor.customCall('informerCommentViolationCase', { violationCaseId, reason });
    });
  },
  'click [data-action="violatorComment"]'(event) {
    event.preventDefault();

    const violationCaseId = paramViolationCaseId();

    askReasonAndConfirmAction({ actionText: '回報說明', reasonText: '內容', note: '（在金管會再次處理前，僅能說明一次）' }, (reason) => {
      Meteor.customCall('violatorCommentViolationCase', { violationCaseId, reason });
    });
  },
  'submit [name="addRelatedCaseForm"]'(event, templateInstance) {
    event.preventDefault();
    event.stopPropagation();

    const violationCaseId = paramViolationCaseId();
    const form = templateInstance.$(event.currentTarget);
    const relatedCaseId = form.find('[name=relatedCaseId]').val().trim();

    if (! relatedCaseId) {
      return;
    }

    const path = FlowRouter.path('violationCaseDetail', { violationCaseId: relatedCaseId });
    const relatedCaseLink = `<a href="${path}" target="_blank">${relatedCaseId}</a>`;
    const actionText = '增加相關案件';
    const confirmText = `確定要將案件 ${relatedCaseLink} 加入為相關案件嗎？`;

    askReasonAndConfirmAction({ actionText, confirmText }, (reason) => {
      Meteor.customCall('addRelatedCaseToViolationCase', { violationCaseId, relatedCaseId, reason });
      form.trigger('reset');
    });
  },
  'click [data-action="removeRelatedCase"]'(event, templateInstance) {
    event.preventDefault();

    const violationCaseId = paramViolationCaseId();
    const relatedCaseId = templateInstance.$(event.currentTarget).attr('data-related-case-id');

    const path = FlowRouter.path('violationCaseDetail', { violationCaseId: relatedCaseId });
    const relatedCaseLink = `<a href="${path}" target="_blank">${relatedCaseId}</a>`;
    const actionText = '移除相關案件';
    const confirmText = `確定要將案件 ${relatedCaseLink} 從相關案件中移除嗎？`;

    askReasonAndConfirmAction({ actionText, confirmText }, (reason) => {
      Meteor.customCall('removeRelatedCaseFromViolationCase', { violationCaseId, relatedCaseId, reason });
    });
  },
  'click [data-action="mergeViolatorsFromRelatedCase"]'(event, templateInstance) {
    event.preventDefault();

    const violationCaseId = paramViolationCaseId();
    const relatedCaseId = templateInstance.$(event.currentTarget).attr('data-related-case-id');

    const path = FlowRouter.path('violationCaseDetail', { violationCaseId: relatedCaseId });
    const relatedCaseLink = `<a href="${path}" target="_blank">${relatedCaseId}</a>`;
    const actionText = '合併違規名單';
    const confirmText = `確定要將相關案件 ${relatedCaseLink} 的違規名單合併至本案件嗎？`;

    askReasonAndConfirmAction({ actionText, confirmText }, (reason) => {
      Meteor.customCall('mergeViolatorsFromRelatedCase', { violationCaseId, relatedCaseId, reason });
    });
  },
  'submit [name="addViolatorForm"]'(event, templateInstance) {
    event.preventDefault();
    event.stopPropagation();

    const violationCaseId = paramViolationCaseId();
    const form = templateInstance.$(event.currentTarget);
    const violatorType = form.find('[name=violatorType]').val();
    const violatorId = form.find('[name=violatorId]').val().trim();

    if (! violatorType || ! violatorId) {
      return;
    }

    const actionText = '增加違規名單';
    const confirmText = `
      確定要將
        <span class="text-info">${violatorTypeDisplayName(violatorType)} ${violatorId}</span>
      加入違規名單嗎？
    `;

    askReasonAndConfirmAction({ actionText, confirmText }, (reason) => {
      Meteor.customCall('addViolatorToViolationCase', { violationCaseId, violatorType, violatorId, reason });
      form.trigger('reset');
    });
  },
  'click [data-action="removeViolator"]'(event, templateInstance) {
    event.preventDefault();

    const violationCaseId = paramViolationCaseId();
    const violatorType = templateInstance.$(event.currentTarget).attr('data-violator-type');
    const violatorId = templateInstance.$(event.currentTarget).attr('data-violator-id');

    const actionText = '移除違規名單';
    const confirmText = `
      確定要將
        <span class="text-info">${violatorTypeDisplayName(violatorType)} ${violatorId}</span>
      從違規名單移除嗎？
    `;

    askReasonAndConfirmAction({ actionText, confirmText }, (reason) => {
      Meteor.customCall('removeViolatorFromViolationCase', { violationCaseId, violatorType, violatorId, reason });
    });
  }
});
