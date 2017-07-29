'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { addTask, resolveTask } from '../layout/loading';
import { handleError } from './handleError';

Meteor.call = (function(_super) {
  function call(...args) {
    addTask();
    const lastArg = _.last(args);
    if (typeof lastArg === 'function') {
      args[args.length - 1] = function(error, result) {
        if (error) {
          handleError(error);
        }
        resolveTask();
        lastArg(error, result);
      };
    }
    else {
      args.push(function(error) {
        if (error) {
          handleError(error);
        }
        resolveTask();
      });
    }

    _super(...args);
  }

  return call;
}(Meteor.call));
