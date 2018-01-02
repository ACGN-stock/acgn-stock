'use strict';
//真正的設定檔請寫在config.json，這邊只是註解用。
export const config = {
  debugMode: false, //是否為debug mode(紀錄一分鐘內的所有方法與訂閱動作，以備crash查看)
  websiteName: 'ACGN股票交易市場', //網站名稱
  intervalTimer: 60000, //每隔多少微秒進行一次工作檢查
  releaseStocksForHighPriceMinCounter: 180, //公司檢查是否要因高股價而釋出股票的最小隨機工作檢查次數
  releaseStocksForHighPriceMaxCounter: 360, //公司檢查是否要因高股價而釋出股票的最大隨機工作檢查次數
  releaseStocksForNoDealMinCounter: 1440, //公司檢查是否要因無成交而釋出股票的最小隨機工作檢查次數
  releaseStocksForNoDealMaxCounter: 2880, //公司檢查是否要因無成交而釋出股票的最大隨機工作檢查次數
  recordListPriceMinCounter: 180, //為所有公司紀錄參考價格的最小隨機工作檢查次數
  recordListPriceMaxCounter: 360, //為所有公司紀錄參考價格的最大隨機工作檢查次數
  checkChairmanCounter: 10, //每隔多少次工作檢查，就重新檢查、設定一次各公司的董事長
  founderEarnestMoney: 1024, //創立公司者需付出的保證金
  foundExpireTime: 43200000, //創立公司的投資時間期限，單位為微秒
  maximumInvest: 4096, //每個人對單一新創計劃的最大投資上限
  foundationNeedUsers: 20, //創立公司所需要的投資人數量
  minReleaseStock: 1000, //公司初創時的最小釋出股份數量(可能會有些微誤差)
  newUserInitialMoney: 10000, //所有使用者驗證通過後的起始資金數量
  newUserBirthStones: 1, //所有使用者驗證通過後的誕生石數量
  salaryPerPay: 1000, //所有驗證通過的使用者每隔一段時間可以固定領取的薪資數量
  seasonNumberInRound: 12, //一個賽季有幾個商業季度
  arenaIntervalSeasonNumber: 1, //最萌亂鬥大賽的舉行會間隔多少個商業季度，0為每個商業季度都會舉辦一次
  arenaMaximumRound: 1000, //最萌亂鬥大賽的最大回合數
  arenaMinInvestedAmount: 10000, //最萌亂鬥大賽的參賽所需最小總投資金額
  seasonTime: 604800000, //每個商業季度的持續時間，單位為微秒
  electManagerTime: 86400000, //每個商業季度結束前多久時間會進行經理競選，單位為微秒
  managerProfitPercent: 0.05, //經理人獲得公司營利分紅的比例
  costFromProfit: 0.15, //系統將扣除多少公司的營利做為公司營運成本
  displayAdvertisingNumber: 5, //同時最多顯示的廣告筆數
  advertisingExpireTime: 259200000, //廣告持續時間，單位為微秒
  maximumFavorite: 60, //每個人的最愛公司數量上限
  maximumRuleIssue: 10, //每個議程的議題數量上限
  maximumRuleIssueOption: 10, //每個議題的選項數量上限
  votePricePerTicket: 3000, //每張推薦票能產生的營利
  voteUserNeedCreatedIn: 604800000, //投票資格所需的註冊時間，單位為微秒
  maximumCompanySalaryPerDay: 2000, //公司員工每日薪資上限
  minimumCompanySalaryPerDay: 500, //公司員工每日薪資下限
  defaultCompanySalaryPerDay: 1000, //公司預設員工每日薪資
  maximumSeasonalBonusPercent: 5, //公司員工季度分紅百分比上限
  minimumSeasonalBonusPercent: 1, //公司員工季度分紅百分比下限
  defaultSeasonalBonusPercent: 5, //公司預設員工季度分紅百分比
  announceSalaryTime: 259200000, //季度結束前多久開放設定薪資，單位為微秒
  announceBonusTime: 86400000, //季度結束前多久開放設定分紅，單位為微秒
  vacationModeZombieTaxPerDay: 500, // 渡假當季的殭屍稅率 (每天)
  minIntervalTimeBetweenVacations: 604800000, // 收假後再次放假所需間隔 (ms)
  taxExpireTime: 259200000, // 稅單的繳費期限 (ms)
  releaseStocksForNoDealTradeLogLookbackIntervalTime: 86400000, // 低量釋股的成交量統計區間 (ms)
  miningMachineOperationTime: 86400000, // 挖礦機的運作時間 (ms)
  stonePrice: { // 可供購買的石頭價格
    rainbow: 100000, // 彩虹石
    rainbowFragment: 10000 // 彩虹石碎片
  },
  dataNumberPerPage: { // 分頁時每個分頁有多少資料
    userPlacedStones: 10
  }
};
export default config;
