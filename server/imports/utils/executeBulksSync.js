import { Promise } from 'meteor/promise';

export function executeBulksSync(...bulks) {
  const executes = bulks
    .filter((bulk) => {
      return bulk.length > 0;
    })
    .map((bulk) => {
      return bulk.execute();
    });
  Promise.await(
    Promise.all(executes)
  );
}
