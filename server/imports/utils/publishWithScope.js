import { wrapScopeKey } from '/common/imports/utils/wrapScopeKey';

// 發佈 cursor 內容的同時增加 scopeKey 的屬性，以便識別來自不同 publication 的資料
export function publishWithScope(subscription, { collection, scope, cursor }) {
  const transformFields = (fields) => {
    return { ...fields, [wrapScopeKey(scope)]: 1 };
  };

  const observer = cursor.observeChanges({
    added: (id, fields) => {
      subscription.added(collection, id, transformFields(fields));
    },
    changed: (id, fields) => {
      subscription.changed(collection, id, transformFields(fields));
    },
    removed: (id) => {
      subscription.removed(collection, id);
    }
  });

  subscription.onStop(() => {
    observer.stop();
  });

  return observer;
}
