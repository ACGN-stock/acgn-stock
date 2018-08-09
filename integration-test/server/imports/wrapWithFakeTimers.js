import sinon from 'sinon';

export function wrapWithFakeTimers(callback) {
  return function() {
    let clock;

    beforeEach(function() {
      clock = sinon.useFakeTimers();
    });

    afterEach(function() {
      clock.restore();
    });

    callback.call(this, clock);
  };
}
