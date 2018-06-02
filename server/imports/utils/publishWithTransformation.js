// 發佈 cursor 內容時將欄位經過轉換再送出
export function publishWithTransformation(subscription, { collection, cursor, transform }) {
  const observer = cursor.observeChanges({
    added: (id, fields) => {
      subscription.added(collection, id, transform(fields));
    },
    changed: (id, fields) => {
      subscription.changed(collection, id, transform(fields));
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
