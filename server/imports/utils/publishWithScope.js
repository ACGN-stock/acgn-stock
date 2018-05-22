import { wrapScopeKey } from '/common/imports/utils/wrapScopeKey';

import { publishWithTransformation } from './publishWithTransformation';

export function appendScope(fields, scope) {
  return { ...fields, [wrapScopeKey(scope)]: 1 };
}

// 發佈 cursor 內容的同時增加 scopeKey 的屬性，以便識別來自不同 publication 的資料
export function publishWithScope(subscription, { collection, scope, cursor }) {
  return publishWithTransformation(subscription, {
    collection,
    cursor,
    transform: (fields) => {
      return appendScope(fields, scope);
    }
  });
}
