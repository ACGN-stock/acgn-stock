import { announcementCategoryMap, dbAnnouncements } from '/db/dbAnnouncements';
import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import mustSinon from 'must-sinon';

import { wrapWithFakeTimers } from '/integration-test/server/imports/wrapWithFakeTimers';
import { voidAnnouncement } from '/server/methods/announcement/voidAnnouncement';

mustSinon(expect);

describe('method voidAnnouncement', wrapWithFakeTimers(function() {
  this.timeout(10000);

  const userId = 'someUser';
  let announcementId;
  const reason = 'some reason';

  beforeEach(function() {
    resetDatabase();
    announcementId = dbAnnouncements.insert({
      creator: userId,
      category: Object.keys(announcementCategoryMap)[0],
      subject: 'Test',
      content: 'This is a test.',
      createdAt: new Date()
    });
  });

  it('should fail if the announcement has been voided', function() {
    const currentUser = {
      _id: userId,
      profile: { roles: [] }
    };
    dbAnnouncements.update(announcementId, { $set: { voided: true } });
    voidAnnouncement.bind(null, currentUser, { announcementId, reason }).must.throw(Meteor.Error, '此公告已作廢！ [403]');
  });

  it('should success when the user is the creator but does not have any roles', function() {
    const currentUser = {
      _id: userId,
      profile: { roles: [] }
    };
    voidAnnouncement.bind(null, currentUser, { announcementId, reason }).must.not.throw();
  });

  ['superAdmin', 'generalManager'].forEach((role) => {
    it(`should success when the user is not the creator but is in role "${role}"`, function() {
      const currentUser = {
        _id: 'otherUser',
        profile: { roles: [role] }
      };
      voidAnnouncement.bind(null, currentUser, { announcementId, reason }).must.not.throw();
    });
  });

  it('should fail if the user is not the creator and does not have any roles', function() {
    const currentUser = {
      _id: 'otherUser',
      profile: { roles: [] }
    };
    voidAnnouncement.bind(null, currentUser, { announcementId, reason }).must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');
  });

  describe('the successfully voided announcement', function() {
    const currentUser = {
      _id: userId,
      profile: { roles: [] }
    };

    beforeEach(function() {
      voidAnnouncement(currentUser, { announcementId, reason });
    });

    it('should have voiding information set', function() {
      const announcement = dbAnnouncements.findByIdOrThrow(announcementId);
      expect(announcement).to.exist();
      announcement.voided.must.be.true();
      announcement.voidedReason.must.be.equal(reason);
      announcement.voidedBy.must.equal(currentUser._id);
      announcement.voidedAt.must.be.eql(new Date());
    });
  });
}));
