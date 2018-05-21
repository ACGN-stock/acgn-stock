require('babel-register')({
  presets: ['env'],
  plugins: [
    'transform-es2015-modules-commonjs',
    'transform-runtime',
    ['module-resolver', { root: ['./'] } ],
    ['transform-strict-mode', { 'strict': true } ]
  ]
});
const libmock = require('mock-require');

libmock('meteor/meteor', './mock/meteor');
libmock('meteor/underscore', './mock/underscore');
libmock('meteor/mongo', './mock/mongo');
libmock('meteor/check', './mock/check');
libmock('meteor/ddp-rate-limiter', './mock/ddp-rate-limiter');
libmock('meteor/mizzao:user-status', './mock/user-status');
