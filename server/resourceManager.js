'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { dbResourceLock } from '../db/dbResourceLock';
// import { dbDebugger } from '../db/dbDebugger';
import { threadId } from './thread';

export const resourceManager = {
  request(task, resourceList, callback) {
    const resourceLock = this.getResourceLock(resourceList);
    if (resourceLock) {
      // const message = '' +
      //   'thread[' + threadId + '] is requesting resource' + JSON.stringify(resourceList) +
      //   ' for task [' + task + '] but need to wait for lock' + JSON.stringify(resourceLock) + '.';
      // dbDebugger.insert({
      //   time: new Date(),
      //   message: message
      // });
      Meteor.setTimeout(() => {
        this.request(task, resourceList, callback);
      }, randomTime());
    }
    else {
      // dbDebugger.insert({
      //   time: new Date(),
      //   message: 'thread[' + threadId + '] is requesting resource' + JSON.stringify(resourceList) + ' for task[' + task + ']!'
      // });
      const time = new Date();
      const release = () => {
        _.each(resourceList, (_id) => {
          dbResourceLock.remove({_id, task, threadId, time});
        });
        // dbDebugger.insert({
        //   time: new Date(),
        //   message: 'thread[' + threadId + '] already release resource' + JSON.stringify(resourceList) + ' for task[' + task + ']!'
        // });
      };
      try {
        _.each(resourceList, (_id) => {
          dbResourceLock.insert({_id, task, threadId, time});
        });
        callback(release);
      }
      catch(e) {
        release();
        console.error('error happens while requesting resources, automatic release resources lock' + JSON.stringify({resourceList, task, threadId, time}) + '!');
        // dbDebugger.insert({
        //   time: new Date(),
        //   message: 'error happens because of ' + e.stack + ', automatic release resources lock' + JSON.stringify({resourceList, task, threadId, time}) + '!'
        // });
        throw e;
      }
    }
  },
  throwErrorIsResourceIsLock(resourceList) {
    const someResourceIsLock = _.some(resourceList, (resource) => {
      return dbResourceLock.findOne(resource);
    });

    if (someResourceIsLock) {
      throw new Meteor.Error(503, '伺服器忙碌中...請稍候再試！');
    }
  },
  getResourceLock(resourceList) {
    const lockStatus = dbResourceLock.find({
      _id: {
        $in: resourceList
      }
    }).fetch();

    if (lockStatus.length > 0) {
      return lockStatus;
    }
    else {
      return null;
    }
  }
};
export default resourceManager;

function randomTime() {
  return Math.floor(Math.random() * 1000);
}
