import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { dbAnnouncements, getAnnounceableCategories, announcementCategoryMap } from '/db/dbAnnouncements';
import { computeActiveUserCount } from '/server/imports/utils/computeActiveUserCount';
import { debug } from '/server/imports/utils/debug';
import { dbNotifications, notificationCategories } from '/db/dbNotifications';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';

Meteor.methods({
  createAnnouncement({ data, rejectionPetitionDurationDays }) {
    check(this.userId, String);
    check(data, {
      category: Match.OneOf(...Object.keys(announcementCategoryMap)),
      subject: String,
      content: String
    });

    if (data.category === 'plannedRuleChanges') {
      check(rejectionPetitionDurationDays, Match.Integer);
    }

    createAnnouncement(Meteor.user(), { data, rejectionPetitionDurationDays });

    return true;
  }
});

export function createAnnouncement(currentUser, { data, rejectionPetitionDurationDays }) {
  debug.log('createAnnouncement', { currentUser, data, rejectionPetitionDurationDays });

  const { category } = data;

  if (! getAnnounceableCategories(currentUser).includes(category)) {
    throw new Meteor.Error(403, '您沒有權限發佈此類型的公告！');
  }

  const extraData = {};

  const nowDate = new Date();
  const oneDayTime = 24 * 60 * 60 * 1000;

  if (['plannedRuleChanges', 'appliedRuleChanges'].includes(category)) {
    const { durationDays, thresholdPercent } = Meteor.settings.public.announcement[category].rejectionPetition;

    let rejectionPetitionDurationTime;

    if (category === 'plannedRuleChanges') {
      if (rejectionPetitionDurationDays < durationDays.min || rejectionPetitionDurationDays > durationDays.max) {
        throw new Meteor.Error(403, '不合法的否決連署持續時間！');
      }
      rejectionPetitionDurationTime = rejectionPetitionDurationDays * oneDayTime;
    }
    else if (category === 'appliedRuleChanges') {
      rejectionPetitionDurationTime = durationDays * oneDayTime;
    }

    const activeUserCount = computeActiveUserCount();
    const dueAt = new Date(nowDate.getTime() + rejectionPetitionDurationTime);

    Object.assign(extraData, {
      rejectionPetition: {
        activeUserCount,
        thresholdPercent,
        dueAt
      }
    });
  }

  const announcementId = dbAnnouncements.insert({
    ...data,
    ...extraData,
    creator: currentUser._id,
    createdAt: nowDate
  });

  const notificationsBulkOp = dbNotifications.rawCollection().initializeUnorderedBulkOp();
  const notificationSchema = dbNotifications.simpleSchema();
  Meteor.users.find({}, { fields: { _id: 1 } }).forEach(({ _id: userId }) => {
    const doc = {
      category: notificationCategories.ANNOUNCEMENT,
      targetUser: userId,
      notifiedAt: nowDate,
      data: { announcementId }
    };
    notificationSchema.validate(doc);
    notificationsBulkOp.insert(doc);
  });
  executeBulksSync(notificationsBulkOp);
}
