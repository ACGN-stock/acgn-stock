import { Meteor } from 'meteor/meteor';

export function deliverProductVouchers() {
  const vouchers = Meteor.settings.public.productVoucherAmount;
  Meteor.users.update({}, {
    $inc: {
      'profile.vouchers': vouchers
    }
  }, { multi: true });
}
