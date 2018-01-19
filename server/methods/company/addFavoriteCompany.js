import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  addFavoriteCompany(companyId) {
    check(this.userId, String);
    check(companyId, String);
    addFavoriteCompany(Meteor.user(), companyId);

    return true;
  }
});
function addFavoriteCompany(user, companyId) {
  debug.log('addFavoriteCompany', { user, companyId });
  if (user.favorite.length >= Meteor.settings.public.maximumFavorite) {
    throw new Meteor.Error(403, '您的最愛已達上限!');
  }
  Meteor.users.update(user._id, {
    $addToSet: {
      favorite: companyId
    }
  });
}
limitMethod('addFavoriteCompany');
