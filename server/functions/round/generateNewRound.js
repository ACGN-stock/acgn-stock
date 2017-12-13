import { Meteor } from 'meteor/meteor';

import { dbRound } from '/db/dbRound';
import { debug } from '/server/imports/utils/debug';

//產生新的賽季
export function generateNewRound() {
  debug.log('generateNewRound');
  const beginDate = new Date();
  const roundTime = Meteor.settings.public.seasonTime * Meteor.settings.public.seasonNumberInRound;
  const endDate = new Date(beginDate.setMinutes(0, 0, 0) + roundTime);
  const roundId = dbRound.insert({beginDate, endDate});

  return roundId;
}
