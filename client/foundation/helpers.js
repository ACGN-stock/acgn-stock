import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbFoundations } from '/db/dbFoundations';

export function paramFoundationId() {
  return FlowRouter.getParam('foundationId');
}

export function paramFoundation() {
  const foundationId = paramFoundationId();

  return foundationId ? dbFoundations.findOne(foundationId) : null;
}
