'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';

export const lockManager = {
  lock(idList, isServer) {
    const isLocked = _.some(idList, (id) => {
      return this.isLocked(id, isServer);
    });
    if (isLocked) {
      // console.log(this.serverLockedList, this.lockedList);
      throw new Meteor.Error(503, '伺服器忙碌中...請稍候再試！', {
        serverLockedList: this.serverLockedList,
        lockedList: this.lockedList
      });
    }
    this.lockIdList(idList, isServer);

    const timeoutId = Meteor.setTimeout(unlock, 60000);
    const unlock = () => {
      Meteor.clearTimeout(timeoutId);
      this.unLockIdList(idList, isServer);
    };

    return unlock;
  }
};
export default lockManager;

if (typeof Set === 'function') {
  lockManager.serverLockedList = new Set();
  lockManager.lockedList = new Set();
  lockManager.isLocked = function(id, isServer) {
    if (isServer) {
      return this.serverLockedList.has(id);
    }
    else {
      return this.serverLockedList.has(id) || lockManager.lockedList.has(id);
    }
  };
  lockManager.lockIdList = function(idList, isServer) {
    if (isServer) {
      _.each(idList, (id) => {
        // console.log('lock 「' + id + '」!');
        this.serverLockedList.add(id);
      });
    }
    else {
      _.each(idList, (id) => {
        // console.log('lock 「' + id + '」!');
        this.lockedList.add(id);
      });
    }
  };
  lockManager.unLockIdList = function(idList, isServer) {
    if (isServer) {
      _.each(idList, (id) => {
        // console.log('unlock 「' + id + '」!');
        this.serverLockedList.delete(id);
      });
    }
    else {
      _.each(idList, (id) => {
        // console.log('unlock 「' + id + '」!');
        this.lockedList.delete(id);
      });
    }
  };
}
else {
  lockManager.serverLockedList = [];
  lockManager.lockedList = [];
  lockManager.isLocked = function(id, isServer) {
    if (isServer) {
      return _.contains(this.serverLockedList, id);
    }
    else {
      return _.contains(this.serverLockedList, id) || _.contains(this.lockedItem, id);
    }
  };
  lockManager.lockIdList = function(idList, isServer) {
    if (isServer) {
      lockManager.serverLockedList = this.serverLockedList.concat(idList);
    }
    else {
      this.lockedList = this.lockedList.concat(idList);
    }
  };
  lockManager.unLockIdList = function(idList, isServer) {
    if (isServer) {
      this.serverLockedList = _.without(this.serverLockedList, ...idList);
    }
    else {
      this.lockedList = _.without(this.lockedList, ...idList);
    }
  };
}
