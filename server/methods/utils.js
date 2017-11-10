export function publishTotalCount(variableId, cursor, publish) {
  let initialized = false;
  let totalCount = cursor.count();
  publish.added('variables', variableId, { value: totalCount });

  const observer = cursor.observeChanges({
    added: () => {
      if (initialized) {
        totalCount += 1;
        publish.changed('variables', variableId, { value: totalCount });
      }
    },
    removed: () => {
      if (initialized) {
        totalCount -= 1;
        publish.changed('variables', variableId, { value: totalCount });
      }
    }
  });
  initialized = true;

  return observer;
}
