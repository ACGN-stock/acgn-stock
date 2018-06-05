import { Meteor } from 'meteor/meteor';

import { dbRound } from '/db/dbRound';

// 沒有任何賽季資料時，以現在時間為基準插入一個新的
if (dbRound.find().count() === 0) {
  const { seasonTime, seasonNumberInRound } = Meteor.settings.public;

  const beginDate = new Date();
  beginDate.setMinutes(0, 0, 0);
  const endDate = beginDate.getTime() + seasonTime * seasonNumberInRound;

  dbRound.insert({ beginDate, endDate });
}
