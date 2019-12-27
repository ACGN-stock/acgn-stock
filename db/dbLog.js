import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 紀錄資料集
export const dbLog = new Mongo.Collection('log', { idGeneration: 'MONGO' });

// 紀錄的種類
export const logTypeList = [
  /**
   * 帳號驗證通過，領取起始資金data.money！
   */
  '驗證通過',

  /**
   * userId0從data.ipAddr登入了系統！
   */
  '登入紀錄',

  /**
   * 【購買得石】userId0花費$data.cost購買了data.amount個data.stoneType！
   */
  '購買得石',

  /**
   * userId0說道：「data.message」
   */
  '聊天發言',

  /**
   * 【發薪紀錄】系統向所有已驗證通過且未就業的使用者發給了$data.salary的薪水！
   * 【發薪紀錄】「companyId」公司向userId...發給了$data.salary的薪水！
   */
  '發薪紀錄',

  /**
   * FIXME: 保管庫功能已移除，此 log 型態未使用
   * 【公司復活】由於userId...等人的投資，位於保管庫中的「companyId」公司成功復活並重新進入新創計劃，(但無人||data.manager將)就任公司經理。
   */
  '公司復活',

  /**
   * 【創立公司】userId0發起了「(companyId || data.companyName)」的新公司創立計劃，誠意邀請有意者投資！
   */
  '創立公司',

  /**
   * 【參與投資】userId0向「(companyId || data.companyName)」公司投資了$data.fund！
   */
  '參與投資',

  /**
   * 【創立失敗】userId...等人投資的「data.companyName公司創立計劃」由於投資人數不足失敗了，投資金額將全數返回！
   */
  '創立失敗',

  /**
   * 【創立退款】userId0從「(companyId || data.companyName)公司創立計劃」收回了$data.refund的投資退款！
   */
  '創立退款',

  /**
   * 【創立成功】userId...等人投資的「companyId公司創立計劃」成功了，該公司正式上市，初始股價為$data.price！
   */
  '創立成功',

  /**
   * 【創立得股】對「companyId公司創立計劃」的$data.fund投資為userId0帶來了data.stocks數量的公司股票！
   */
  '創立得股',

  /**
   * 【購買下單】userId0想要用每股$data.price的單價買入data.amount數量的「companyId」公司股票！
   */
  '購買下單',

  /**
   * 【販賣下單】userId0想要用每股$data.price的單價賣出data.amount數量的「companyId」公司股票！
   */
  '販賣下單',

  /**
   * 【取消下單】usreId0取消了以每股$data.price的單價data.orderType data.amount數量的「companyId」公司股票的訂單！
   */
  '取消下單',

  /**
   * 【系統撤單】因商業季度結束，系統自動取消了userId0以每股$data.price的單價data.orderType data.amount數量的「companyId」公司股票的訂單！
   */
  '系統撤單',

  /**
   * 【訂單完成】userId0以每股$data.price的單價data.orderType data.amount數量的「companyId」公司股票的訂單已經全數交易完畢！
   * 【訂單完成】companyId以每股$data.price的單價釋出data.amount數量股票的訂單已經全數交易完畢！
   */
  '訂單完成',

  /**
   * 【公司釋股】「companyId」公司以$data.price的價格釋出了data.amount數量的股票到市場上套取利潤！
   */
  '公司釋股',

  /**
   * 【交易紀錄】userId0以$data.price的單價向(userId1 || 「companyId」公司)購買了data.amount數量的「companyId」公司股票！
   */
  '交易紀錄',

  /**
   * 【辭職紀錄】userId0辭去了「companyId」公司的經理人職務！
   */
  '辭職紀錄',

  /**
   * 【撤職紀錄】userId0以「data.reason」的理由撤除userId1於「companyId」公司的經理人職務與候選資格！
   */
  '撤職紀錄',

  /**
   * 【參選紀錄】userId0開始競選「companyId」公司的經理人職務！
   */
  '參選紀錄',

  /**
   * 【支持紀錄】userId0開始支持userId1擔任「companyId」公司的經理人。
   */
  '支持紀錄',

  /**
   * 【就任經理】userId0在data.seasonName商業季度以data.stocks數量的支持股份勝出，
   *   (成為了「companyId」公司的經理人。 || 繼續擔任「companyId」公司的經理人職務。 || 取代了userId1成為了「companyId」公司的經理人。)
   */
  '就任經理',

  /**
   * 【經理管理】userId0修改了「companyId」公司的資訊！
   */
  '經理管理',

  /**
   * 【推薦產品】userId0向「companyId」公司的產品「data.productId」投了一張推薦票(，使其獲得了$data.profit的營利額)！
   */
  '推薦產品',

  /**
   * 【購買產品】userId0花費(消費券$data.voucherCost)?(以及)?(現金$data.moneyCost)?買了「companyId」公司的產品「data.productId」共data.amount個，使該公司獲得了$data.profit的營利額！`;
   */
  '購買產品',

  /**
   * 【員工營利】users.join('、')等人努力工作，使「companyId」公司獲得了$data.profit的營利額！
   */
  '員工營利',

  /**
   * 【公司營利】「companyId」公司在本商業季度一共獲利$data.profit！
   */
  '公司營利',

  /**
   * 【營利分紅】「companyId」公司的資本額增加了$data.amount！
   * 【營利分紅】userId0得到了「companyId」公司的(data.bonusType || 分紅)$data.amount！
   */
  '營利分紅',

  /**
   * 【推薦回饋】系統發給了userId0產品投票回饋金$data.reward！
   */
  '推薦回饋',

  /**
   * 【消費回饋】userId0得到了「companyId」公司的產品消費回饋金$data.rebate！
   */
  '消費回饋',

  /**
   * 【季度賦稅】userId0在此次商業季度中產生了$data.stockTax的股票資產稅、$data.moneyTax的現金資產稅與$data.zombieTax的殭屍稅！
   */
  '季度賦稅',

  /**
   * 【繳納稅金】userId0向系統繳納了$data.paid的稅金！
   */
  '繳納稅金',

  /**
   * 【繳稅逾期】userId0由於繳稅逾期，被系統追加了$data.fine的稅金！
   */
  '繳稅逾期',

  /**
   * 【繳稅沒收】userId0由於繳稅逾期，被系統沒收了$data.money的現金！
   */
  '繳稅沒金',

  /**
   * 【繳稅沒收】userId0由於繳稅逾期，被系統撤銷了所有買入訂單！
   */
  '繳稅撤單',

  /**
   * 【繳稅沒收】userId0由於繳稅逾期，被系統以參考價格$data.price沒收了「companyId」公司的股份數量data.stocks！
   */
  '繳稅沒收',

  /**
   * 【廣告宣傳】userId0以$data.cost的價格發布了一則廣告：「data.message」！
   */
  '廣告宣傳',

  /**
   * 【廣告競價】userId0追加了$data.cost的廣告費用在userId1發佈的廣告：「data.message」上！
   */
  '廣告追加',

  /**
   * 【舉報違規】userId0以「data.reason」的理由向金融管理會舉報
   *   (「companyId」公司(及其經理人userId1)的違例事項。 || userId1的違規行為。)
   */
  '舉報違規',

  /**
   * 【金管通告】userId0以金管會的名義向(「companyId」公司(及其經理人userId1) || userId...)通告：「data.message」。
   */
  '金管通告',

  /**
   * 【通報金管】userId0向金管會通報：「data.message」。
   */
  '通報金管',

  /**
   * 【玩家停權】userId0以「data.reason」的理由禁止userId1今後的所有舉報違規行為。
   */
  '禁止舉報',

  /**
   * 【玩家停權】userId0以「data.reason」的理由禁止userId1今後的所有投資下單行為。
   */
  '禁止下單',

  /**
   * 【玩家停權】userId0以「data.reason」的理由禁止userId1今後的所有聊天發言行為。
   */
  '禁止聊天',

  /**
   * 【玩家停權】userId0以「data.reason」的理由禁止userId1今後的所有廣告宣傳行為。
   */
  '禁止廣告',

  /**
   * 【玩家停權】userId0以「data.reason」的理由禁止userId1今後編輯個人簡介。
   */
  '禁止簡介',

  /**
   * 【課以罰款】userId0以「data.reason」的理由向(userId1||「companyId」公司)課以總數為$data.fine的罰金。
   */
  '課以罰款',

  /**
   * 【沒收股份】userId0以「data.reason」的理由將userId1持有的「companyId」公司股份數量data.stocks給沒收了。
   */
  '沒收股份',

  /**
   * 【清除簡介】userId0以「data.reason」的理由將userId1的個人簡介給清空了。
   */
  '清除簡介',

  /**
   * 【金管撤單】userId0以「data.reason」的理由取消了userId1以每股$data.price的單價data.orderType data.amount數量的「companyId」公司股票的訂單！
   */
  '金管撤單',

  /**
   * 【玩家停權】userId0以「data.reason」的理由禁止userId1今後擔任經理人的資格。
   */
  '禁任經理',

  /**
   * 【玩家復權】userId0以「data.reason」的理由中止了userId1的舉報違規禁令。
   */
  '解除舉報',

  /**
   * 【玩家復權】userId0以「data.reason」的理由中止了userId1的投資下單禁令。
   */
  '解除下單',

  /**
   * 【玩家復權】userId0以「data.reason」的理由中止了userId1的聊天發言禁令。
   */
  '解除聊天',

  /**
   * 【玩家復權】userId0以「data.reason」的理由中止了userId1的廣告宣傳禁令。
   */
  '解除廣告',

  /**
   * 【玩家復權】userId0以「data.reason」的理由中止了userId1的編輯個人簡介禁令。
   */
  '解除簡介',

  /**
   * 【退還罰款】userId0以「data.reason」的理由向(userId1||「companyId」公司)退還總數為$data.fine的罰金。
   */
  '退還罰款',

  /**
   * 【玩家復權】userId0以「data.reason」的理由中止了userId1禁任經理人的處置。
   */
  '解除禁任',

  /**
   * 【查封關停】userId0以「data.reason」的理由查封關停了「companyDisplay」公司。
   */
  '查封關停',

  /**
   * 【解除查封】userId0以「data.reason」的理由解除了「companyId」公司的查封關停狀態。
   */
  '解除查封',

  /**
   * 【違規標記】userId0以「data.reason」的理由將「companyId」公司標記為違規！
   */
  '違規標記',

  /**
   * 【違規標記】userId0移除了「companyId」公司的違規標記！
   */
  '違規解標',

  /**
   * 【公司更名】userId0將「companyId」公司的名稱由「data.oldCompanyName」改為「data.newCompanyName」。
   */
  '公司更名',

  /**
   * 【產品下架】userId0以「data.reason」的理由將「companyId」公司的產品「data.productName」給下架了(，並追回了因該產品所產生的營利$data.profit)。
   */
  '產品下架',

  /**
   * 【產品修正】userId0以金管會的名義修改了「companyId」公司的產品「data.productId」，將{each d in data.diff}keyof(d)由「d.before」改為「d.after」(、){/each}。
   */
  '產品修正',

  /**
   * 【撤銷廣告】userId0將userId1發布的廣告「data.message」給撤銷了。
   */
  '撤銷廣告',

  /**
   * 【最萌亂鬥】userId0替「companyId」公司報名參加了這一屆的最萌亂鬥大賽！
   */
  '亂鬥報名',

  /**
   * 【最萌亂鬥】「companyId」公司因為總投資金額未達標，失去了這一屆最萌亂鬥大賽的參賽資格！
   */
  '亂鬥失格',

  /**
   * 【最萌亂鬥】userId0從「companyId」公司收回了$data.refund的投資退款！
   */
  '亂鬥退款',

  /**
   * 【最萌亂鬥】userId0對這一屆最萌亂鬥大賽參賽者「companyId」公司的data.attrName能力值投資了$data.money的金錢！
   */
  '亂鬥加強',

  /**
   * 【最萌亂鬥】「companyId」公司在這一屆最萌亂鬥大賽中表現出眾，獲得了$data.reward的營利金額！
   */
  '亂鬥營利',

  /**
   * 【礦機營利】「companyId」公司的挖礦機集結眾人之力努力運轉，使其獲得了$data.profit的營利額！
   */
  '礦機營利',

  /**
   * 【身份指派】userId0以「data.reason」的理由將userId1指派了data.role的身份！
   */
  '身份指派',

  /**
   * 【身份解除】userId0以「data.reason」的理由將userId1解除了data.role的身份！
   */
  '身份解除',

  /**
   * 【營運送禮】userId0以「data.reason」的理由發給了所有玩家data.amount數量的data.giftType！
   * 【營運送禮】userId0以「data.reason」的理由發給了所有活躍玩家data.amount數量的data.giftType！
   * 【營運送禮】userId0以「data.reason」的理由發給了所有data.days天內有登入的玩家data.amount數量的data.giftType！
   * 【營運送禮】userId0以「data.reason」的理由發給了玩家userId...data.amount數量的data.giftType！
   */
  '營運送禮'
];

// log 的分組，方便以群組方式 filtering 之用
export const logTypeGroupMap = {
  login: {
    displayName: '登入紀錄',
    logTypes: [
      '登入紀錄'
    ]
  },
  miningMachines: {
    displayName: '挖礦機與石頭相關',
    logTypes: [
      '購買得石',
      '礦機營利'
    ]
  },
  foundations: {
    displayName: '新創計創相關',
    logTypes: [
      '創立公司',
      '參與投資',
      '創立失敗',
      '創立退款',
      '創立成功',
      '創立得股'
    ]
  },
  trading: {
    displayName: '交易相關',
    logTypes: [
      '購買下單',
      '販賣下單',
      '取消下單',
      '系統撤單',
      '金管撤單',
      '訂單完成',
      '交易紀錄',
      '公司釋股'
    ]
  },
  managers: {
    displayName: '經理相關',
    logTypes: [
      '辭職紀錄',
      '參選紀錄',
      '支持紀錄',
      '就任經理',
      '經理管理',
      '撤職紀錄'
    ]
  },
  products: {
    displayName: '產品相關',
    logTypes: [
      '推薦產品',
      '購買產品',
      '推薦回饋',
      '消費回饋'
    ]
  },
  profitsAndBonuses: {
    displayName: '營利與分紅相關',
    logTypes: [
      '員工營利',
      '公司營利',
      '營利分紅',
      '亂鬥營利',
      '礦機營利'
    ]
  },
  taxes: {
    displayName: '稅賦相關',
    logTypes: [
      '季度賦稅',
      '繳納稅金',
      '繳稅逾期',
      '繳稅沒金',
      '繳稅撤單',
      '繳稅沒收'
    ]
  },
  advertisings: {
    displayName: '廣告相關',
    logTypes: [
      '廣告宣傳',
      '廣告追加'
    ]
  },
  arenas: {
    displayName: '亂鬥相關',
    logTypes: [
      '亂鬥報名',
      '亂鬥失格',
      '亂鬥退款',
      '亂鬥加強',
      '亂鬥營利'
    ]
  },
  roles: {
    displayName: '身份組相關',
    logTypes: [
      '身份指派',
      '身份解除'
    ]
  },
  fsc: {
    displayName: '金管會相關',
    logTypes: [
      '舉報違規',
      '金管通告',
      '通報金管',
      '禁止舉報',
      '禁止下單',
      '禁止聊天',
      '禁止廣告',
      '禁止簡介',
      '課以罰款',
      '清除簡介',
      '沒收股份',
      '金管撤單',
      '禁任經理',
      '解除舉報',
      '解除下單',
      '解除聊天',
      '解除廣告',
      '解除簡介',
      '退還罰款',
      '解除禁任',
      '查封關停',
      '解除查封',
      '違規標記',
      '違規解標',
      '公司更名',
      '產品下架',
      '產品修正',
      '撤銷廣告',
      '撤職紀錄'
    ]
  },
  miscellaneous: {
    displayName: '其他雜項',
    logTypes: [
      '驗證通過',
      '發薪紀錄',
      '營運送禮',
      '公司復活'
    ]
  }
};

// 金管會相關紀錄
export const fscLogTypeList = logTypeGroupMap.fsc.logTypes;

// 重要的金管會相關紀錄，需要發出未讀通知給使用者
export const importantFscLogTypeList = [
  '金管通告',
  '禁止舉報',
  '禁止下單',
  '禁止聊天',
  '禁止廣告',
  '禁止簡介',
  '課以罰款',
  '清除簡介',
  '沒收股份',
  '金管撤單',
  '禁任經理',
  '解除舉報',
  '解除下單',
  '解除聊天',
  '解除廣告',
  '解除簡介',
  '退還罰款',
  '解除禁任',
  '撤銷廣告'
];

const schema = new SimpleSchema({
  // 紀錄類別
  logType: {
    type: String,
    allowedValues: logTypeList
  },
  // 相關的使用者 ID 陣列
  userId: {
    type: Array,
    optional: true
  },
  'userId.$': {
    type: String
  },
  // 相關的公司 ID
  companyId: {
    type: String,
    optional: true
  },
  // 額外資料
  data: {
    type: Object,
    blackbox: true,
    optional: true
  },
  // 紀錄日期
  createdAt: {
    type: Date
  }
});
dbLog.attachSchema(schema);
