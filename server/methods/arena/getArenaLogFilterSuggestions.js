import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { limitMethod } from '/server/imports/utils/rateLimit';
import { dbArena } from '/db/dbArena';
import { dbArenaFighters } from '/db/dbArenaFighters';
import { dbCompanies } from '/db/dbCompanies';
import { buildSearchRegExp } from '/server/imports/utils/buildSearchRegExp';

Meteor.methods({
  getArenaLogFilterSuggestions(args) {
    check(args, {
      arenaId: String,
      keyword: String
    });

    return getArenaLogFilterSuggestions(args);
  }
});
function getArenaLogFilterSuggestions({ arenaId, keyword }) {
  const { endDate } = dbArena.findByIdOrThrow(arenaId);

  if (endDate.getTime() > Date.now() || ! keyword) {
    return [];
  }

  const arenaFighterCompanyIdList = _.pluck(dbArenaFighters.find({ arenaId }).fetch(), 'companyId');

  return dbCompanies
    .find({
      _id: { $in: arenaFighterCompanyIdList },
      companyName: buildSearchRegExp(keyword, 'exact'),
      isSeal: false
    }, {
      fields: { companyName: 1 }
    })
    .fetch()
    .reduce((list, { _id: companyId, companyName }) => {
      list.push({ companyId, companyName });

      return list;
    }, []);
}
// 一分鐘最多20次
limitMethod('getArenaLogFilterSuggestions');
