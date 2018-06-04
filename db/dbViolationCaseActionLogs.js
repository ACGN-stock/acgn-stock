import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

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
    dataSchema: new SimpleSchema({
      // 設定的狀態
      state: {
        type: String,
        allowedValues: Object.keys(stateMap)
      }
    }).extend(reasonSchema)
  },
  comment: {
    displayName: '加註',
    allowedStates: Object.keys(stateMap),
    dataSchema: reasonSchema
  },
  addRelatedCase: {
    displayName: '增加相關案件',
    allowedStates: ['processing'],
    dataSchema: new SimpleSchema({
      // 相關案件 ID
      relatedCaseId: String
    }).extend(reasonSchema)
  },
  removeRelatedCase: {
    displayName: '移除相關案件',
    allowedStates: ['processing'],
    dataSchema: new SimpleSchema({
      // 相關案件 ID
      relatedCaseId: String
    }).extend(reasonSchema)
  },
  mergeViolatorsFromRelatedCase: {
    displayName: '從相關案件合併違規名單',
    allowedStates: ['processing'],
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
    dataSchema: new SimpleSchema({
      violator: violatorSchema
    }).extend(reasonSchema)
  }
};

export function actionDisplayName(action) {
  return (actionMap[action] || { displayName: `未知(${action})` }).displayName;
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
