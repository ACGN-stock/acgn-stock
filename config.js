'use strict';
export const config = {
  websiteName: 'PTT ACGN股票交易市場', //網站名稱
  validateUserUrl: '', //驗證使用者帳號使用的推文文章PTT Web版頁面url
  validateBoard: 'C_Chat', //驗證使用者帳號使用的推文文章所在的PTT板面
  validateAID: '', //驗證使用者帳號使用的推文文章在板上的AID
  intervalTimer: 60000, //每隔多少微秒進行一次工作檢查
  foundExpireTime: 300000, //創立公司的投資時間期限，單位為微秒
  foundationNeedUsers: 10, //創立公司所需要的投資人數量
  beginReleaseStock: 1000, //公司初創時的初始總釋出股份數量(可能會有些微誤差)
  beginMoney: 10000, //所有使用者驗證通過後的起始資金數量
  salaryPerPay: 1000, //所有驗證通過的使用者每隔一段時間可以固定領取的薪資數量
  paySalaryCounter: 30, //每隔多少次工作檢查就付多少薪水給所有驗證通過的使用者
  releaseStocksChance: 1000, //決定每個公司釋出股票的機率，數值越高機率越低（就需要更多的優值買單才能提高機率）
  seasonTime: 3600000, //每個商業季度的持續時間，單位為微秒
  seasonProfitPerUser: 10000, //每個商業季度、每個驗證的使用者皆會產生多少營利給排名靠前的企業
  managerProfitPercent: 0.05 //經理人獲得公司營利分紅的比例
};
export default config;
