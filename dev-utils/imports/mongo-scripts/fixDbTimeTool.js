function fixEventSchedule(eventScheduleId, fixDateFunc) {
  const oldEventSchedule = db.eventSchedules.findOne({ _id: eventScheduleId });
  if (! oldEventSchedule) {
    return;
  }

  db.eventSchedules.update(
    { _id: eventScheduleId },
    { $set: { scheduledAt: fixDateFunc(oldEventSchedule.scheduledAt) } }
  );
}

function fixVariable(variableId, fixDateFunc) {
  const oldVariable = db.variables.findOne({ _id: variableId });
  db.variables.update(
    { _id: variableId },
    { $set: { value: fixDateFunc(new Date(oldVariable.value)).getTime() } }
  );
}

function fixUsersLastLogin(fixDateFunc) {
  db.users.find().forEach((oldUserData) => {
    if (! oldUserData.status || ! oldUserData.status.lastLogin) {
      // 只登入一次的使用者
      // TODO 修正 Accounts.createUser 不會自帶 status 的問題後 刪除此判斷
      return;
    }
    db.users.update(
      { _id: oldUserData._id },
      { $set: { 'status.lastLogin.date': fixDateFunc(oldUserData.status.lastLogin.date) } }
    );
  });
}

function fixTaxesExpireDate(fixDateFunc) {
  db.taxes.find().forEach((oldTaxData) => {
    db.taxes.update(
      { _id: oldTaxData._id },
      { $set: { expireDate: fixDateFunc(oldTaxData.expireDate) } }
    );
  });
}

function fixFoundations(fixDateFunc) {
  db.foundations.find().forEach((oldFoundation) => {
    db.foundations.update(
      { _id: oldFoundation._id },
      { $set: { createdAt: fixDateFunc(oldFoundation.createdAt) } }
    );
  });
}


const lastLog = db.log.find().sort({ createdAt: -1 }).limit(1)[0];
const addTime = Date.now() - lastLog.createdAt.getTime();
const fixDateToNow = (oldDate) => {
  return new Date(oldDate.getTime() + addTime);
};

fixEventSchedule('company.releaseStocksForHighPrice', fixDateToNow);
fixVariable('releaseStocksForHighPriceBegin', fixDateToNow);
fixVariable('releaseStocksForHighPriceEnd', fixDateToNow);

fixEventSchedule('company.releaseStocksForNoDeal', fixDateToNow);
fixVariable('releaseStocksForNoDealBegin', fixDateToNow);
fixVariable('releaseStocksForNoDealEnd', fixDateToNow);

fixEventSchedule('company.recordListPrice', fixDateToNow);
fixVariable('recordListPriceEnd', fixDateToNow);
fixVariable('recordListPriceBegin', fixDateToNow);

fixEventSchedule('company.checkChairman', fixDateToNow);
fixEventSchedule('vip.checkVipLevels', fixDateToNow);
fixUsersLastLogin(fixDateToNow);
fixTaxesExpireDate(fixDateToNow);
fixFoundations(fixDateToNow);


const lastSeason = db.season.find().sort({ endDate: -1 }).limit(1)[0];
const lostWeekTime = (Math.floor((Date.now() - lastSeason.beginDate.getTime()) / 604800000) + (new Date().getDay() >= 5 ? 1 : 0)) * 604800000;
const fixDateToNextWeek = (oldDate) => {
  return new Date(oldDate.getTime() + lostWeekTime);
};

fixEventSchedule('season.electManager', fixDateToNextWeek);
fixEventSchedule('arena.joinEnded', fixDateToNextWeek);
fixEventSchedule('product.finalSale', fixDateToNextWeek);
db.season.update({ _id: lastSeason._id }, { $set: { endDate: fixDateToNextWeek(lastSeason.endDate) } });
const lastArena = db.arena.find().sort({ endDate: -1 }).limit(1)[0];
db.arena.update(
  { _id: lastArena._id },
  { $set: {
    endDate: fixDateToNextWeek(lastArena.endDate),
    joinEndDate: fixDateToNextWeek(lastArena.joinEndDate)
  } }
);


fixEventSchedule('global.daily', () => {
  return new Date(new Date(Date.now() + 24 * 60 * 60 * 1000).setUTCHours(0, 0, 0, 0));
});
