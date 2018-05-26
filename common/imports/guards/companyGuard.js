import { Meteor } from 'meteor/meteor';

import { guardUser } from './';

class CompanyGuard {
  constructor(company) {
    this.company = company;
  }

  checkNotSealed() {
    if (this.company.isSeal) {
      throw new Meteor.Error(403, `「${this.company.companyName}」公司已被金融管理委員會查封關停了！`);
    }

    return this;
  }

  checkManager(userId) {
    if (this.company.manager !== userId) {
      throw new Meteor.Error(401, `使用者${userId}並非該公司的經理人！`);
    }

    return this;
  }

  checkIsManageableByUser(user) {
    if (! this.company.manager || this.company.manager === '!none') {
      // 無經理人的狀況下，可由金管會成員代為管理
      guardUser(user).checkHasRole('fscMember');
    }
    else {
      // 有經理人的狀況下，只有經理人可以管理
      this.checkManager(user._id);
    }

    return this;
  }
}

export function guardCompany(company) {
  return new CompanyGuard(company);
}
