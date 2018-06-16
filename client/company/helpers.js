import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';

export function paramCompanyId() {
  return FlowRouter.getParam('companyId');
}

export function paramCompany() {
  const companyId = paramCompanyId();

  return companyId ? dbCompanies.findOne(companyId) : null;
}

// 取得當前使用者持有指定公司的股份數量
export function getCurrentUserOwnedStockAmount(companyId) {
  const user = Meteor.user();
  if (user) {
    const userId = user._id;
    const directorData = dbDirectors.findOne({ companyId, userId });

    return directorData ? directorData.stocks : 0;
  }
  else {
    return 0;
  }
}
