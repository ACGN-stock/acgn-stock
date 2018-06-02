import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

// 依名稱對個別 method 做額外限制
export function limitMethod(name, number = 20, interval = 60000) {
  const type = 'method';
  DDPRateLimiter.addRule(
    { type, name, clientAddress },
    number,
    interval
  );
}

// 依名稱對個別 subscription 做額外限制
export function limitSubscription(name, number = 20, interval = 60000) {
  const type = 'subscription';
  DDPRateLimiter.addRule(
    { type, name, clientAddress },
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
    { type, name },
    number,
    interval
  );
}
