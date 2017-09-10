import imageType from 'image-type';
import http from 'http';
import SimpleSchema from 'simpl-schema';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

export const checkImageUrl = Meteor.wrapAsync(checkImageUrlAsync);

function checkImageUrlAsync(url, callback) {
  check(url, String);
  if (! SimpleSchema.RegEx.Url.test(url)) {
    callback(new Meteor.Error(403, '「' + url + '」並非合法的網址！'));
  }
  url = url.replace('https://', 'http://');
  http.get(url, (res) => {
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

