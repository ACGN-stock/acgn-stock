import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';

import { banTypeList, banTypeDescription, hasRole, hasAnyRoles } from '/db/users';
import { getCurrentRound } from '/db/dbRound';

class UserGuard {
  constructor(user) {
    this.user = user;
  }

  checkNotInVacation() {
    if (this.user.profile.isInVacation) {
      throw new Meteor.Error(403, '您現在正在渡假中，請好好放鬆！');
    }

    return this;
  }

  checkNoExpiredTaxes() {
    if (this.user.profile.notPayTax) {
      throw new Meteor.Error(403, '您現在有稅單逾期未繳！');
    }

    return this;
  }

  checkNotBanned(...banTypes) {
    banTypes.forEach((banType) => {
      if (_.contains(this.user.profile.ban, banType)) {
        throw new Meteor.Error(403, `您現在被禁止了${banTypeDescription(banType)}！`);
      }
    });

    return this;
  }

  checkHasVoteTickets() {
    if (this.user.profile.voteTickets < 1) {
      throw new Meteor.Error(403, '推薦票數量不足！');
    }

    return this;
  }

  checkHasMoney(money = 1) {
    if (this.user.profile.money < money) {
      throw new Meteor.Error(403, '金錢不足！');
    }

    return this;
  }

  checkHasRole(role) {
    if (! hasRole(this.user, role)) {
      throw new Meteor.Error(403, '權限不符，無法進行此操作！');
    }

    return this;
  }

  checkHasAnyRoles(...roles) {
    if (! hasAnyRoles(this.user, ...roles)) {
      throw new Meteor.Error(403, '權限不符，無法進行此操作！');
    }

    return this;
  }

  checkNotHasRole(role) {
    if (hasRole(this.user, role)) {
      throw new Meteor.Error(403, '權限不符，無法進行此操作！');
    }

    return this;
  }

  checkCanVote() {
    this.checkNotBanned(...banTypeList)
      .checkNoExpiredTaxes();

    if (this.user.profile.money < 0) {
      throw new Meteor.Error(403, '現金為負數者不可投票！');
    }

    const now = Date.now();
    const { voteUserNeedCreatedIn } = Meteor.settings.public;
    const { beginDate: roundBeginDate } = getCurrentRound();

    if (now - roundBeginDate.getTime() > voteUserNeedCreatedIn * 2) { // XXX: why * 2 ?
      const userCreatedAt = this.user.createdAt;
      if (! userCreatedAt || (now - userCreatedAt.getTime() < voteUserNeedCreatedIn)) {
        throw new Meteor.Error(403, '註冊時間不足，不可投票！');
      }
    }

    return this;
  }
}

export function guardUser(user) {
  return new UserGuard(user);
}

export function guardCurrentUser() {
  return new UserGuard(Meteor.user());
}
