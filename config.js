'use strict';
export const config = {
  debugMode: false, //是否為debug mode(紀錄一分鐘內的所有方法與訂閱動作，以備crash查看)
  websiteName: 'ACGN股票交易市場', //網站名稱
  intervalTimer: 60000, //每隔多少微秒進行一次工作檢查
  releaseStocksForHighPriceMinCounter: 60, //公司檢查是否要因高股價而釋出股票的最小隨機工作檢查次數
  releaseStocksForHighPriceMaxCounter: 180, //公司檢查是否要因高股價而釋出股票的最大隨機工作檢查次數
  releaseStocksForNoDealMinCounter: 1440, //公司檢查是否要因無成交而釋出股票的最小隨機工作檢查次數
  releaseStocksForNoDealMaxCounter: 2880, //公司檢查是否要因無成交而釋出股票的最大隨機工作檢查次數
  releaseStocksForLowPriceCounter: 720, //公司檢查是否要因低股價而釋出股票的工作檢查次數
  recordListPriceMinCounter: 180, //為所有公司紀錄參考價格的最小隨機工作檢查次數
  recordListPriceMaxCounter: 360, //為所有公司紀錄參考價格的最大隨機工作檢查次數
  checkChairmanCounter: 10, //每隔多少次工作檢查，就重新檢查、設定一次各公司的董事長
  foundExpireTime: 43200000, //創立公司的投資時間期限，單位為微秒
  maximumInvest: 4096, //每個人對單一新創計劃的最大投資上限
  foundationNeedUsers: 10, //創立公司所需要的投資人數量
  minReleaseStock: 1000, //公司初創時的最小釋出股份數量(可能會有些微誤差)
  beginMoney: 10000, //所有使用者驗證通過後的起始資金數量
  salaryPerPay: 1000, //所有驗證通過的使用者每隔一段時間可以固定領取的薪資數量
  seasonTime: 604800000, //每個商業季度的持續時間，單位為微秒
  seasonProfitPerUser: 140000, //每個商業季度、每個驗證的使用者的「所有推薦票加總」將產生多少可能營利額
  managerProfitPercent: 0.05, //經理人獲得公司營利分紅的比例
  costFromProfit: 0.15, //系統將扣除多少公司的營利做為公司營運成本
  displayAdvertisingNumber: 5, //同時最多顯示的廣告筆數
  advertisingExpireTime: 259200000, //廣告持續時間，單位為微秒
  maximumFavorite: 60 //每個人的最愛公司數量上限
};
export default config;
