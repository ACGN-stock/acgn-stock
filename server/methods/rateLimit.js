'use strict';
// import { Meteor } from 'meteor/meteor';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
// import { debug } from '../debug';

//廣域限制: 一分鐘最多執行60個method
DDPRateLimiter.addRule(
  {
    type: 'method',
    clientAddress: clientAddress
  },
  60000,
  60
);

//依名稱對個別method做額外限制
export function limitMethod(name, number = 20, interval = 60000) {
  const type = 'method';
  DDPRateLimiter.addRule(
    {type, name, clientAddress},
    number,
    interval
  );
}

//依名稱對個別subscription做額外限制
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
// const connectionIpHash = {};
// Meteor.onConnection(function(connection) {
//   debug.log('onConnection', connection.clientAddress);
//   const ip = connection.clientAddress;
//   if (ip !== '140.113.139.18') {
//     if (! ip || connectionIpHash[ip] >= 2) {
//       connection.close();

//       return false;
//     }
//   }

//   if (connectionIpHash[ip]) {
//     connectionIpHash[ip] = 2;
//   }
//   else {
//     connectionIpHash[ip] = 1;
//   }
//   connection.onClose(function() {
//     connectionIpHash[ip] -= 1;
//   });
//   if (connectionIpHash[ip] > 2) {
//     connection.close();
//   }
// });
