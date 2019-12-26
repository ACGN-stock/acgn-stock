import imageType from 'image-type';
import http from 'http';
import https from 'https';
import SimpleSchema from 'simpl-schema';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { debug } from '/server/imports/utils/debug';

export const checkImageUrl = Meteor.wrapAsync(checkImageUrlAsync);

function checkImageUrlAsync(url, callback) {
  debug.log('checkImageUrlAsync', url);
  check(url, String);
  if (! SimpleSchema.RegEx.Url.test(url)) {
    return callback(new Meteor.Error(403, '「' + url + '」並非合法的網址！'));
  }
  let req;
  if (url.indexOf('https://') === 0) {
    req = https.get(url);
  }
  else {
    req = http.get(url);
  }
  req.on('error', () => {
    callback(new Meteor.Error(403, '「' + url + '」並非合法的網址！'));
  });
  req.on('response', (res) => {
    let checkResult;
    res.once('data', (chunk) => {
      checkResult = imageType(chunk);
      res.destroy();
    });
    res.once('end', () => {
      if (checkResult) {
        callback(null, true);
      }
      else {
        callback(new Meteor.Error(403, '「' + url + '」並非合法的網址！'));
      }
    });
  });
}
