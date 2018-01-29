import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbCompanies } from '/db/dbCompanies';

export function paramCompanyId() {
  return FlowRouter.getParam('companyId');
}

export function paramCompany() {
  const companyId = paramCompanyId();

  return companyId ? dbCompanies.findOne(companyId) : null;
}
