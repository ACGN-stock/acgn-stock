import sinon from 'sinon';

export const SimpleSchema = sinon.stub();
SimpleSchema.extendOptions = sinon.stub();
SimpleSchema.messages = sinon.stub();
SimpleSchema.prototype.messages = sinon.stub();
SimpleSchema.prototype.validator = sinon.stub();
SimpleSchema.RegEx = {
  Id: sinon.stub()
};
