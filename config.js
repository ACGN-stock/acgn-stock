// 真正的設定檔請寫在config.json，這邊只是註解用。
export const config = {
  debugMode: false, // 是否為debug mode(紀錄一分鐘內的所有方法與訂閱動作，以備crash查看)
  websiteInfo: { // 網站資訊
    websiteName: 'ACGN股票交易市場', // 網站名稱
    description: '｜ 尋找你的老婆！ \n｜ 喜歡嗎？那麼就入股吧！',
    domainName: 'acgn-stock.com',
    image: 'https://acgn-stock.com/ms-icon-310x310.png',
    timezone: 8 // 主要客群所在的時區 (可能與server的時區不同)
  },
  prerender: {
    use: false, // 是否使用prerender功能 (需要另外架設prerender server)
    url: 'http://127.0.0.1:3900/' // prerender server的位置
  },
  google: {
    analytics: 'UA-143586675-2' // GA Tracking ID (結尾 -1: prod, -2: dev)
  },
  intervalTimer: 60000, // 每隔多少毫秒進行一次工作檢查
  releaseStocksForHighPriceInterval: { // 高價釋股的排程時間範圍 (ms)
    min: 10800000,
    max: 21600000
  },
  releaseStocksForNoDealInterval: { // 低成交量釋股的排程時間範圍 (ms)
    min: 86400000,
    max: 172800000
  },
  recordListPriceInterval: { // 參考價更新的排程時間範圍 (ms)
    min: 10800000,
    max: 21600000
  },
  priceLimits: { // 訂單漲跌停幅度設定
    normal: { // 一般公司
      upper: 1.15,
      lower: 0.85
    },
    lowPriceCompany: {
      upper: 1.30
    },
    firstStageValueLowerThanCapitalCompany: {
      lower: 0.95
    },
    secondStageValueLowerThanCapitalCompany: {
      lower: 0.9
    }
  },
  valueLowerThanCapitalCompanyFallLimitTimes: { // 公司創立多少時間內 市值低於資本額將進行跌幅限制
    firstStageTime: 604800000, // 在多少時間(ms)內 進行第一階段的跌幅限制
    secondStageTime: 1209600000
  },
  zeroVolumePriceDrop: { // 無量跌停設定
    orderAgeThreshold: 21600000, // 賣單需要存在的時間 (ms)
    tradeVolumeLookbackTime: 86400000 // 交易量的統計時間 (ms)
  },
  checkChairmanInterval: 600000, // 董事長檢查的排程時間 (ms)
  founderEarnestMoney: 1024, // 創立公司者需付出的保證金
  foundExpireTime: 43200000, // 創立公司的投資時間期限，單位為毫秒
  foundationVariablesUpdateSeasonOrdinals: [2], // 新創相關變數的更新季度編號，於季度開始時更新
  maximumInvest: 4096, // 每個人對單一新創計劃的最大投資上限
  minReleaseStock: 1000, // 公司初創時的最小釋出股份數量(可能會有些微誤差)
  newUserInitialMoney: 10000, // 所有使用者驗證通過後的起始資金數量
  newUserBirthStones: 1, // 所有使用者驗證通過後的誕生石數量
  salaryPerPay: 1000, // 所有驗證通過的使用者每隔一段時間可以固定領取的薪資數量
  seasonNumberInRound: 13, // 一個賽季有幾個商業季度
  arenaIntervalSeasonNumber: 1, // 最萌亂鬥大賽的舉行會間隔多少個商業季度，0為每個商業季度都會舉辦一次
  arenaMaximumRound: 1000, // 最萌亂鬥大賽的最大回合數
  arenaMinInvestedAmount: 10000, // 最萌亂鬥大賽的參賽所需最小總投資金額
  arenaJoinEndTime: 86400000, // 最萌亂鬥大賽的報名截止時間，距離舉辦大賽的商業季度的結束時間 (ms)
  seasonTime: 604800000, // 每個商業季度的持續時間，單位為毫秒
  electManagerTime: 86400000, // 每個商業季度**結束前多久時間**會進行經理競選 (ms)
  electManagerLastLoginTimeThreshold: 259200000, // 經理選舉時候選人或投票人判定為活躍玩家時，距離上次登入時間之上限 (ms)
  contendManagerEndTime: 129600000, // 每個商業季度**結束前多久時間**結束經理選舉的報名 (ms)
  displayAdvertisingNumber: 5, // 同時最多顯示的廣告筆數
  advertisingExpireTime: 259200000, // 廣告持續時間，單位為毫秒
  maximumFavorite: 60, // 每個人的最愛公司數量上限
  maximumRuleIssue: 10, // 每個議程的議題數量上限
  maximumRuleIssueOption: 10, // 每個議題的選項數量上限
  votePricePerTicket: 3000, // 每張推薦票能產生的營利
  voteUserNeedCreatedIn: 604800000, // 投票資格所需的註冊時間，單位為毫秒
  maximumCompanySalaryPerDay: 2000, // 公司員工每日薪資上限
  minimumCompanySalaryPerDay: 500, // 公司員工每日薪資下限
  defaultCompanySalaryPerDay: 1000, // 公司預設員工每日薪資
  announceSalaryTime: 259200000, // 季度結束前多久開放設定薪資，單位為毫秒
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
    userPlacedStones: 10,
    companyStones: 10,
    userOwnedProducts: 10,
    companyMarketingProducts: 10,
    companyVips: 10,
    announcements: 20,
    accountInfoLogs: 30,
    violationCases: 10,
    violationCaseAssociatedLogs: 30,
    userViolationCases: 10,
    userReportedViolationCases: 10,
    compoanyViolationCases: 10,
    fscLogs: 30,
    companyOrders: 10,
    arenaFighterList: 20,
    arenaLog: 30
  },
  productFinalSaleTime: 86400000, // 產品最後出清時間 (ms)
  systemProductVotingReward: 4096, // 系統派發的推薦票回饋金
  productVoucherAmount: 7000, // 產品消費券的數量
  productRebates: { // 產品滿額回饋設定
    divisorAmount: 2000, // 滿額條件
    initialDeliverPercent: 100.0, // 第一次達成滿額條件可得回饋百分比 (%)
    minDeliverPercent: 77.5 // 最小可得回饋百分比 (%)
  },
  vipParameters: { // VIP 各等級的參數
    0: {
      productProfitFactor: 1.40, // 產品營利乘數
      stockBonusFactor: 1.00 // 分紅股權乘數
    },
    1: {
      productProfitFactor: 1.45,
      stockBonusFactor: 1.02
    },
    2: {
      productProfitFactor: 1.80,
      stockBonusFactor: 1.05
    },
    3: {
      productProfitFactor: 2.15,
      stockBonusFactor: 1.10
    },
    4: {
      productProfitFactor: 2.49,
      stockBonusFactor: 1.25
    },
    5: {
      productProfitFactor: 2.50,
      stockBonusFactor: 2.00
    }
  },
  vipLevelCheckInterval: 1800000, // VIP 等級更新時間 (ms)
  vipPreviousSeasonScoreWeight: 0.80, // VIP 上季分數的權重
  companyProfitDistribution: { // 公司營利的分配設定
    lockTime: 86400000, // 分配設定調整的封關時間 (ms)
    incomeTaxRatePercent: 10, // 公司所得稅佔比 (%)
    managerBonusRatePercent: { // 經理人分紅 (%)
      min: 1,
      max: 5,
      default: 5
    },
    employeeBonusRatePercent: { // 員工分紅 (%)
      min: 1,
      max: 5,
      default: 5
    },
    employeeProductVotingRewardRatePercent: 1, // 員工投票獎金 (%)
    capitalIncreaseRatePercent: { // 資本額增加量 (%)
      min: 1,
      limit: 15, // 經理人分紅、員工分紅、資本額增加三者的加總上限
      default: 3
    }
  },
  newRoundFoundationRestrictionTime: 3600000, // 新賽季禁止新創的時間 (ms)
  announcement: { // 系統公告相關設定
    plannedRuleChanges: { // 規則更動計劃
      rejectionPetition: { // 否決連署設定
        durationDays: { // 持續時間 (天)
          min: 3,
          max: 7
        },
        thresholdPercent: 10 // 連署門檻 (%)
      },
      rejectionPoll: { // 否決投票設定
        durationDays: 3, // 持續時間 (天)
        thresholdPercent: 15 // 投票率門檻 (%)
      }
    },
    appliedRuleChanges: { // 規則更動套用
      rejectionPetition: { // 否決連署設定
        durationDays: 14, // 持續時間 (天)
        thresholdPercent: 20 // 連署門檻 (%)
      },
      rejectionPoll: { // 否決投票設定
        durationDays: 3, // 持續時間 (天)
        thresholdPercent: 30 // 投票率門檻 (%)
      }
    }
  },
  autoRedirectDomainPortSettings: { // 當前端domain符合設置且port不符合時，自動redirect
    '8880': 'test.acgn-stock.com'
  }
};
export default config;
