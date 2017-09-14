'use strict';
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

//廣域限制: 一分鐘最多執行60個method
DDPRateLimiter.addRule(
  {
    type: 'method',
    clientAddress: clientAddress
  },
  60000,
  60
);

//依名稱對各別method做額外限制
export function limitMethod(name, number = 20, interval = 60000) {
  const type = 'method';
  DDPRateLimiter.addRule(
    {type, name, clientAddress},
    number,
    interval
  );
}

export function limitSubscription(name, number = 20, interval = 60000) {
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

export function limitGlobalMethod(name, number = 1, interval = 60000) {
  const type = 'method';
  DDPRateLimiter.addRule(
    {type, name},
    number,
    interval
  );
}

//同一ip最多兩個connection
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
