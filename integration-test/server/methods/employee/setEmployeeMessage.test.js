import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';

import { dbEmployees } from '/db/dbEmployees';
import { setEmployeeMessage } from '/server/methods/employee/setEmployeeMessage';

describe('method setEmployeeMessage', function() {
  this.timeout(10000);

  const companyId = 'someCompany';
  const userId = 'someUser';
  const message = 'Example message.';

  beforeEach(function() {
    resetDatabase();
  });

  it('should fail if the user is not an employee of the specified company', function() {
    setEmployeeMessage.bind(null, userId, companyId, message)
      .must.throw(Meteor.Error, '使用者並非公司的在職員工，無法進行員工留言！ [401]');
  });

  it('should fail if the user is registered as an employee of the specified company but not yet being employed', function() {
    dbEmployees.insert({ companyId, userId, employed: false, resigned: false, registerAt: new Date() });

    setEmployeeMessage.bind(null, userId, companyId, message)
      .must.throw(Meteor.Error, '使用者並非公司的在職員工，無法進行員工留言！ [401]');
  });

  it('should fail if the user was an employee of the specified company but has been resigned', function() {
    dbEmployees.insert({ companyId, userId, employed: true, resigned: true, registerAt: new Date() });

    setEmployeeMessage.bind(null, userId, companyId, message)
      .must.throw(Meteor.Error, '使用者並非公司的在職員工，無法進行員工留言！ [401]');
  });

  describe('when the user is an employee of the specified company', function() {
    let employeeId;

    beforeEach(function() {
      employeeId = dbEmployees.insert({ companyId, userId, employed: true, resigned: false, registerAt: new Date() });
    });

    it('should set the message', function() {
      setEmployeeMessage(userId, companyId, message);

      const employeeData = dbEmployees.findOne({ _id: employeeId });
      expect(employeeData).to.exist();
      expect(employeeData.message).to.equal(message);
    });

    it('should unset the message if the message will trim to empty', function() {
      const spaceOnlyMessage = '    ';
      spaceOnlyMessage.trim().must.be.equal('');

      setEmployeeMessage(userId, companyId, spaceOnlyMessage);

      const employeeData = dbEmployees.findOne({ _id: employeeId });
      expect(employeeData).to.exist();
      expect(employeeData.message).to.not.exist();
    });

    it('should fail if the message is too long (length > 100)', function() {
      const veryLongMessage = `This is a very very long message which is too long to be stored in the database.
        Repeat: this is a very very long message which is too long to be stored in the database.`;
      veryLongMessage.length.must.be.at.least(100);

      setEmployeeMessage.bind(null, userId, companyId, veryLongMessage)
        .must.throw(/Message cannot exceed 100 characters/);
    });
  });
});
