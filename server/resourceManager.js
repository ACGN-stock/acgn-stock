'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { dbResourceLock } from '../db/dbResourceLock';
import { threadId } from './thread';
import { debug } from './debug';

export const resourceManager = {
  request(task, resourceList, callback) {
    debug.log('request resource', {task, resourceList});
    // let requestTime = 0;
    const resourceLock = this.getResourceLock(resourceList);
    if (resourceLock) {
      // const message = '' +
      //   'thread[' + threadId + '] is requesting resource' + JSON.stringify(resourceList) +
      //   ' for task [' + task + '] but need to wait for lock' + JSON.stringify(resourceLock) + '.';
      // console.info(new Date(), message);
      Meteor.setTimeout(() => {
        // requestTime += 1;
        // if (requestTime >= 10) {
        //   console.error('repeat same request warning!');
        //   console.error(task, resourceList);
        // }
        this.request(task, resourceList, callback);
      }, randomTime());
    }
    else {
      // const message = 'thread[' + threadId + '] is requesting resource' + JSON.stringify(resourceList) + ' for task[' + task + ']!';
      // console.info(new Date(), message);
      const time = new Date();
      const release = () => {
        _.each(resourceList, (_id) => {
          dbResourceLock.remove({_id, task, threadId, time});
        });
        // const message = 'thread[' + threadId + '] already release resource' + JSON.stringify(resourceList) + ' for task[' + task + ']!';
        // console.info(new Date(), message);
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
        console.error('error: ' + JSON.stringify(e));

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
  return Math.floor(Math.random() * 3000);
}
