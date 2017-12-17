export function publishTotalCount(variableId, cursor, publisher) {
  let initialized = false;
  let totalCount = cursor.count();
  publisher.added('variables', variableId, { value: totalCount });

  const observer = cursor.observeChanges({
    added: () => {
      if (initialized) {
        totalCount += 1;
        publisher.changed('variables', variableId, { value: totalCount });
      }
    },
    removed: () => {
      if (initialized) {
        totalCount -= 1;
        publisher.changed('variables', variableId, { value: totalCount });
      }
    }
  });
  initialized = true;

  publisher.onStop(() => {
    observer.stop();
  });

  return observer;
}
