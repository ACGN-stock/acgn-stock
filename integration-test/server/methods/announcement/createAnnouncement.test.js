import { announcementCategoryMap, dbAnnouncements } from '/db/dbAnnouncements';
import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { wrapWithFakeTimers } from '/integration-test/server/imports/wrapWithFakeTimers';
import { createAnnouncement } from '/server/methods/announcement/createAnnouncement';
import { userRoleMap } from '/db/users';

mustSinon(expect);

describe('method createAnnouncement', wrapWithFakeTimers(function() {
  this.timeout(10000);

  const userId = 'someUser';

  const basicAnnouncementData = {
    subject: 'Test',
    content: 'This is a test.'
  };

  beforeEach(function() {
    resetDatabase();
  });

  describe('permissions', function() {
    Object.entries(announcementCategoryMap).forEach(([category, { announceableBy } ]) => {
      Object.keys(userRoleMap).filter((role) => {
        return ! announceableBy.includes(role);
      }).forEach((role) => {
        const userData = {
          _id: userId,
          profile: {
            roles: [role]
          }
        };

        const announcementData = { ...basicAnnouncementData, category };

        it(`should fail if a user with only role "${role}" tries to create an announcement in category "${category}"`, function() {
          createAnnouncement.bind(null, userData, { data: announcementData })
            .must.throw(Meteor.Error, '您沒有權限發佈此類型的公告！ [403]');
        });
      });
    });
  });

  describe('with category plannedRuleChanges', function() {
    const userData = {
      _id: userId,
      profile: {
        roles: announcementCategoryMap.plannedRuleChanges.announceableBy
      }
    };

    const announcementData = { ...basicAnnouncementData, category: 'plannedRuleChanges' };

    const { durationDays, thresholdPercent } = Meteor.settings.public.announcement.plannedRuleChanges.rejectionPetition;

    it('should fail if the provided petition duration is too short', function() {
      createAnnouncement.bind(null, userData, {
        data: announcementData,
        rejectionPetitionDurationDays: durationDays.min - 1
      }).must.throw(Meteor.Error, '不合法的否決連署持續時間！ [403]');
    });


    it('should fail if the provided petition duration is too long', function() {
      createAnnouncement.bind(null, userData, {
        data: announcementData,
        rejectionPetitionDurationDays: durationDays.max + 1
      }).must.throw(Meteor.Error, '不合法的否決連署持續時間！ [403]');
    });

    it('should create a new announcement containing petition data', function() {
      const providedDurationDays = durationDays.min;
      createAnnouncement.bind(null, userData, {
        data: announcementData,
        rejectionPetitionDurationDays: providedDurationDays
      }).must.not.throw();

      const announcement = dbAnnouncements.findOne();
      expect(announcement).to.exist();
      expect(announcement.rejectionPetition).to.exist();
      expect(announcement.rejectionPetition.activeUserCount).to.exist();
      expect(announcement.rejectionPetition.thresholdPercent).to.equal(thresholdPercent);
      expect(announcement.rejectionPetition.dueAt).to.eql(new Date(Date.now() + providedDurationDays * 24 * 60 * 60 * 1000));
    });
  });

  describe('with category appliedRuleChanges', function() {
    const userData = {
      _id: userId,
      profile: {
        roles: announcementCategoryMap.appliedRuleChanges.announceableBy
      }
    };

    const announcementData = { ...basicAnnouncementData, category: 'appliedRuleChanges' };

    const { durationDays, thresholdPercent } = Meteor.settings.public.announcement.appliedRuleChanges.rejectionPetition;

    it('should create a new announcement containing petition data', function() {
      createAnnouncement.bind(null, userData, { data: announcementData }).must.not.throw();

      const announcement = dbAnnouncements.findOne();
      expect(announcement).to.exist();
      expect(announcement.rejectionPetition).to.exist();
      expect(announcement.rejectionPetition.activeUserCount).to.exist();
      expect(announcement.rejectionPetition.thresholdPercent).to.equal(thresholdPercent);
      expect(announcement.rejectionPetition.dueAt).to.eql(new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000));
    });
  });
}));
