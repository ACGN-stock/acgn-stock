import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { limitMethod } from '/server/imports/utils/rateLimit';
import { debug } from '/server/imports/utils/debug';

Meteor.methods({
  removeFavoriteCompany(companyId) {
    check(this.userId, String);
    check(companyId, String);
    removeFavoriteCompany(Meteor.user(), companyId);

    return true;
  }
});
function removeFavoriteCompany(user, companyId) {
  debug.log('removeFavoriteCompany', { user, companyId });
  const index = user.favorite.indexOf(companyId);
  if (index >= 0) {
    const newFavorite = user.favorite.slice();
    newFavorite.splice(index, 1);
    Meteor.users.update(user._id, {
      $set: {
        favorite: newFavorite
      }
    });
  }
}
limitMethod('removeFavoriteCompany');
