import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbCompanies } from '/db/dbCompanies';

defineMigration({
  version: 9,
  name: 'employee system',
  up() {
    const { defaultCompanySalaryPerDay, defaultSeasonalBonusPercent } = Meteor.settings.public;

    dbCompanies.update({}, {
      $set: {
        salary: defaultCompanySalaryPerDay,
        nextSeasonSalary: defaultCompanySalaryPerDay,
        seasonalBonusPercent: defaultSeasonalBonusPercent
      }
    }, { multi: true });
  }
});
