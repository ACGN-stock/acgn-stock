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
  const urlObject = new URL(url);
  if (urlObject.protocol === 'https:') {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const type = imageType(buffer);
        if (! type) {
          return callback(new Meteor.Error(403, '「' + url + '」並非合法的圖片網址！'));
        }
        callback(null, true);
      });

      res.on('error', (err) => {
        console.log(err);
        callback(new Meteor.Error(403, '「' + url + '」並非合法的網址！'));
      });
    });
  }
  else {
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const type = imageType(buffer);
        if (! type) {
          return callback(new Meteor.Error(403, '「' + url + '」並非合法的圖片網址！'));
        }
        callback(null, true);
      });

      res.on('error', (err) => {
        console.log(err);
        callback(new Meteor.Error(403, '「' + url + '」並非合法的網址！'));
      });
    });
  }
}
