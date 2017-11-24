import imageType from 'image-type';
import http from 'http';
import https from 'https';
import SimpleSchema from 'simpl-schema';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { debug } from '/server/imports/debug';

export const checkImageUrl = Meteor.wrapAsync(checkImageUrlAsync);

function checkImageUrlAsync(url, callback) {
  debug.log('checkImageUrlAsync', url);
  check(url, String);
  if (! SimpleSchema.RegEx.Url.test(url)) {
    callback(new Meteor.Error(403, '「' + url + '」並非合法的網址！'));
  }
  const httpCallback = (res) => {
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
    res.on('error', () => {
      callback(new Meteor.Error(403, '「' + url + '」並非合法的網址！'));
    });
  };
  const agent = false;
  const httpOptions = {url, agent};
  if (url.indexOf('https://') === 0) {
    const req = https.get(httpOptions, httpCallback);
    req.on('error', () => {
      callback(new Meteor.Error(403, '「' + url + '」並非合法的網址！'));
    });
  }
  else {
    const req = http.get(httpOptions, httpCallback);
    req.on('error', () => {
      callback(new Meteor.Error(403, '「' + url + '」並非合法的網址！'));
    });
  }
}
