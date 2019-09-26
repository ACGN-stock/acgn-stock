import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

import { guardUser } from '/common/imports/guards';
import { stateMap, violatorSchema } from './dbViolationCases';

// 違規案件處理動作紀錄資料集
export const dbViolationCaseActionLogs = new Mongo.Collection('violationCaseActionLogs');

const reasonSchema = new SimpleSchema({
  // 執行動作的原因
  reason: {
    type: String,
    min: 1,
    max: 2000
  }
});

export const actionMap = {
  setState: {
    displayName: '設定案件狀態',
    allowedStates: Object.keys(stateMap),
    allowedIdentity: 'fsc',
    dataSchema: new SimpleSchema({
      // 設定的狀態
      state: {
        type: String,
        allowedValues: Object.keys(stateMap)
      }
    }).extend(reasonSchema)
  },
  fscComment: {
    displayName: '金管會加註',
    allowedStates: Object.keys(stateMap),
    allowedIdentity: 'fsc',
    dataSchema: reasonSchema
  },
  informerComment: {
    displayName: '舉報人說明',
    allowedStates: ['pending', 'processing'],
    allowedIdentity: 'informer',
    dataSchema: reasonSchema
  },
  violatorComment: {
    displayName: '違規人說明',
    allowedStates: ['pending', 'processing'],
    allowedIdentity: 'violator',
    dataSchema: reasonSchema
  },
  addRelatedCase: {
    displayName: '增加相關案件',
    allowedStates: ['processing'],
    allowedIdentity: 'fsc',
    dataSchema: new SimpleSchema({
      // 相關案件 ID
      relatedCaseId: String
    }).extend(reasonSchema)
  },
  removeRelatedCase: {
    displayName: '移除相關案件',
    allowedStates: ['processing'],
    allowedIdentity: 'fsc',
    dataSchema: new SimpleSchema({
      // 相關案件 ID
      relatedCaseId: String
    }).extend(reasonSchema)
  },
  mergeViolatorsFromRelatedCase: {
    displayName: '從相關案件合併違規名單',
    allowedStates: ['processing'],
    allowedIdentity: 'fsc',
    dataSchema: new SimpleSchema({
      // 相關案件 ID
      relatedCaseId: String,
      // 被併入的違規名單
      newViolators: {
        type: Array,
        defaultValue: []
      },
      'newViolators.$': violatorSchema
    }).extend(reasonSchema)
  },
  addViolator: {
    displayName: '增加違規名單',
    allowedStates: ['processing'],
    allowedIdentity: 'fsc',
    dataSchema: new SimpleSchema({
      // 加入的違規名單
      newViolators: {
        type: Array,
        defaultValue: []
      },
      'newViolators.$': violatorSchema
    }).extend(reasonSchema)
  },
  removeViolator: {
    displayName: '移除違規名單',
    allowedStates: ['processing'],
    allowedIdentity: 'fsc',
    dataSchema: new SimpleSchema({
      violator: violatorSchema
    }).extend(reasonSchema)
  }
};

export function actionDisplayName(action) {
  return (actionMap[action] || { displayName: `未知(${action})` }).displayName;
}

export function checkUserIdentityAndCaseState(action, user, { informer, violators, state }) {
  checkUserIdentity(action, user, { informer, violators });
  checkCaseState(action, state);
}

function checkUserIdentity({ allowedIdentity }, user, { informer, violators }) {
  switch (allowedIdentity) {
    case 'fsc': {
      return guardUser(user).checkHasRole('fscMember');
    }
    case 'informer': {
      if (informer !== user._id) {
        throw new Meteor.Error(403, '權限不符，無法進行此操作！');
      }

      return;
    }
    case 'violator': {
      if (! _.findWhere(violators, { violatorId: user._id })) {
        throw new Meteor.Error(403, '權限不符，無法進行此操作！');
      }

      return;
    }
    default: {
      return;
    }
  }
}

function checkCaseState({ allowedStates }, state) {
  if (allowedStates && ! allowedStates.includes(state)) {
    throw new Meteor.Error(403, '案件狀態不符！');
  }
}

const schema = new SimpleSchema({
  // 案件 ID
  violationCaseId: {
    type: String
  },
  // 執行的動作
  action: {
    type: String,
    allowedValues: Object.keys(actionMap)
  },
  // 執行人 user ID
  executor: {
    type: String
  },
  // 額外資料
  data: {
    type: Object,
    blackbox: true,
    defaultValue: {},
    custom() {
      const action = this.siblingField('action').value;
      const { dataSchema } = (actionMap[action] || {});

      if (! dataSchema) {
        return;
      }

      try {
        dataSchema.validate(this.value);
      }
      catch (error) {
        this.addValidationErrors(error.details);

        return 'error';
      }
    }
  },
  // 執行時間
  executedAt: {
    type: Date
  }
});
dbViolationCaseActionLogs.attachSchema(schema);
