import { Meteor } from 'meteor/meteor';
import { getInitialVoteTicketCount, getCurrentSeason } from '/db/dbSeason';

export function resetAllUserVoteTickets() {
  const voteTickets = getInitialVoteTicketCount(getCurrentSeason());
  Meteor.users.update({}, {
    $set: {
      'profile.voteTickets': voteTickets
    }
  }, { multi: true });
}
