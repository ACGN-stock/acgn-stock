import sinon from 'sinon';

export const DDPRateLimiter = {
  addRule: sinon.stub(),
  removeRule: sinon.stub(),
  setErrorMessage: sinon.stub()
};
