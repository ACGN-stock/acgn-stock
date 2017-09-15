'use strict';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

export function limitMethod(name, interval = 3000, number = 2) {
  const type = 'method';
  DDPRateLimiter.addRule(
    {type, name, clientAddress},
    number,
    interval
  );
}

export function limitSubscription(name, interval = 10000, number = 3) {
  const type = 'subscription';
  DDPRateLimiter.addRule(
    {type, name, clientAddress},
    number,
    interval
  );
}
function clientAddress() {
  return true;
}

export function limitGlobalMethod(name, interval = 60000, number = 1) {
  const type = 'method';
  DDPRateLimiter.addRule(
    {type, name},
    number,
    interval
  );
}

const connectionIpList = new Mongo.Collection("connectionIp", {
  connection: null
});
Meteor.onConnection(function(connection) {
  const ip = connection.clientAddress;
  if (connectionIpList.find({ip}).count() > 1) {
    connection.close();
  }
  else {
    connectionIpList.insert({
      _id: connection.id,
      ip: connection.clientAddress
    });
    connection.onClose(function() {
      connectionIpList.remove(connection.id);
    });
  }
});
