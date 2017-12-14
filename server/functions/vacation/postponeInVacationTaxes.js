import { Meteor } from 'meteor/meteor';

import { dbTaxes } from '/db/dbTaxes';

// 將放假中使用者的繳稅期限延後
export function postponeInVacationTaxes() {
  const inVacationUserIds = Meteor.users
    .find({ 'profile.isInVacation': true }, { _id: 1 })
    .map(({ _id }) => {
      return _id;
    });

  dbTaxes
    .find({ userId: { $in: inVacationUserIds } }, { _id: 1, expireDate: 1 })
    .forEach(({ _id: taxId, expireDate }) => {
      dbTaxes.update({ _id: taxId }, {
        $set: { expireDate: new Date(expireDate.getTime() + Meteor.settings.public.seasonTime) }
      });
    });
}
