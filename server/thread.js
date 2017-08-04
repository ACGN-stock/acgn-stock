'use strict';
import { _ } from 'meteor/underscore';
// import { dbDebugger } from '../db/dbDebugger';

export const threadId = (process.env.GALAXY_CONTAINER_ID || '') + '!' + process.pid;
console.log('a thread is start as unique id:' + threadId + '.');
// dbDebugger.insert({
//   time: new Date(),
//   message: 'a thread is start as unique id:' + threadId + '.'
// });

export const shouldReplaceThread = _.memoize(function(anotherThreadId) {
  return threadId < anotherThreadId;
});

