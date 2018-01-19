// 找尋2017-12-17 13:00 (UTC+0800) 之後的所有交易紀錄，加回公司營利
// see issue #306

const effectiveLogs = db.log
  .find({
    logType: '交易紀錄',
    userId: { $size: 1 },
    createdAt: { $gte: new Date('2017-12-17T04:00:00Z') }
  })
  .sort({ createdAt: 1 });

const profitIncreaseMap = {};

effectiveLogs.forEach(({ companyId, userId: [userId], data: { price, amount }, createdAt }) => {
  const profitIncrease = price * amount;
  profitIncreaseMap[companyId] = (profitIncreaseMap[companyId] || 0) + profitIncrease;
  print(`${createdAt.toISOString()} 時公司 ${companyId} 因使用者 ${userId} 以 $${price} 購買 ${amount} 公司釋股的行為增加了 $${profitIncrease} 的營利！`);
});

const companyBulk = db.companies.initializeUnorderedBulkOp();

Object.keys(profitIncreaseMap).forEach((companyId) => {
  const profitIncrease = profitIncreaseMap[companyId];
  companyBulk
    .find({ _id: companyId })
    .updateOne({ $inc: { profit: profitIncrease } });
});

print(companyBulk.execute());
