import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

// 廣域限制: 同一 ip 一分鐘最多執行 60 個 method
DDPRateLimiter.addRule({
  type: 'method',
  clientAddress() {
    return true;
  }
}, 60000, 60);
