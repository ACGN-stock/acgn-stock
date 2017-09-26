'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//紀錄資料集
export const dbLog = new Mongo.Collection('log', {
  idGeneration: 'MONGO'
});
export default dbLog;

export const logTypeList = [
  '驗證通過', //帳號驗證通過，領取起始資金$price！
  '登入紀錄', //userId0從message登入了系統！
  '免費得石', //因為「message」的理由獲得了amount顆聖晶石！
  '聊天發言', //userId0說道：「message」
  '發薪紀錄', //系統向所有已驗證通過的使用者發給了$price的薪水！
  '創立公司', //userId0發起了「message」的新公司創立計劃，誠意邀請有意者投資！
  '參與投資', //userId0向「message公司創立計劃」投資了$amount！
  '創立失敗', //userId...等人投資的「message公司創立計劃」由於投資人數不足失敗了，投資金額將全數返回！
  '創立退款', //(userId0)從「message公司創立計劃」收回了$amount的投資退款！
  '創立成功', //userId...等人投資的「companyId」成功了，該公司正式上市，初始股價為$price！
  '創立得股', //(userId0)對「companyId」的投資為你帶來了amount數量的公司股票！
  '購買下單', //userId0想要用每股$price的單價購買amount數量的「companyId」公司股票！
  '販賣下單', //userId0想要用每股$price的單價販賣amount數量的「companyId」公司股票！
  '取消下單', //userId0取消了以每股$price的單價message(購入/賣出)amount數量的companyId股票的訂單！
  '系統撤單', //因商業季度結束，系統自動取消了userId0以每股$price的單價message(購入/賣出)amount數量的companyId股票的訂單！
  '訂單完成', //userId0以每股$price的單價message(購入/賣出)amount數量的「companyId」公司股票的訂單已經全數交易完畢！
  '公司釋股', //「companyId」公司以$price的價格釋出amount數量的股票到市場上套取利潤！
  '交易紀錄', //userId0以$price的單價向(userId1 || companyId)購買了amount數量的「companyId」公司股票！
  '辭職紀錄', //userId0辭去了「companyId」公司的經理人職務！
  '撤職紀錄', //userId0被金融管理委員會撤除了「companyId」公司的經理人職務與候選資格！
  '參選紀錄', //userId0開始競選「companyId」公司的經理人職務！
  '支持紀錄', //userId0支持userId1擔任「companyId」公司的經理人！
  '就任經理', //userId0在message商業季度(以amount數量的支持股份)擊敗了所有競爭對手，取代userId1成為「companyId」公司的經理人！
  '經理管理', //userId0修改了「companyId」公司的資訊！
  '推薦產品', //userId0推薦了#productId產品，使「companyId」公司獲得了$price的營利額！
  '公司營利', //「companyId」公司本商業季度一共獲利$amount！
  '營利分紅', //userId0得到了「companyId」公司的分紅$amount！
  '季度賦稅', //userId0在此次商業季度中產生了$amount的財富稅與$price的殭屍稅！
  '繳納稅金', //userId0向系統繳納了$amount的稅金！
  '繳稅逾期', //userId0由於繳稅逾期，被系統追加了$amount的稅金！
  '繳稅撤單', //userId0由於繳稅逾期，被系統撤銷了所有買入訂單！
  '繳稅沒收', //userId0由於繳稅逾期，被系統以參考價格$price沒收了「companyId」公司的股份數量amount！
  '廣告宣傳', //userId0以$price的價格發布了一則廣告：「message」。
  '廣告追加', //userId0追加了$price的廣告費用在廣告：「message」上。
  '舉報違規', //userId0以「message」的理由向金融管理會舉報(userId1(ipAddr=userId2)的違規行為 || productId產品的違例事項 || companyId公司的違例事項)。
  '禁止舉報', //userId0以「message」的理由禁止userId1今後的所有舉報違規行為。
  '禁止下單', //userId0以「message」的理由禁止userId1今後的所有投資下單行為。
  '禁止聊天', //userId0以「message」的理由禁止userId1今後的所有聊天發言行為。
  '禁止廣告', //userId0以「message」的理由禁止userId1今後的所有廣告宣傳行為。
  '課以罰款', //userId0以「message」的理由向userId1課以總數為$amount的罰金。
  '沒收股份', //userId0以「message」的理由將userId1持有的「companyId」公司股份數量amount給沒收了。
  '禁任經理', //userId0以「message」的理由禁止userId1今後擔任經理人的資格。
  '解除舉報', //userId0以「message」的理由中止了userId1的舉報違規禁令。
  '解除下單', //userId0以「message」的理由中止了userId1的投資下單禁令。
  '解除聊天', //userId0以「message」的理由中止了userId1的聊天發言禁令。
  '解除廣告', //userId0以「message」的理由中止了userId1的廣告宣傳禁令。
  '退還罰款', //userId0以「message」的理由向userId1退還總數為$amount的罰金。
  '解除禁任', //userId0以「message」的理由中止了userId1今後禁任經理人的處置。
  '查封關停', //userId0以「message」的理由查封關停了「companyId」公司。
  '解除查封', //userId0以「message」的理由解除了「companyId」公司的查封關停狀態。
  '產品下架', //userId0以「message」的理由將「companyId」公司的產品「productId」給下架了，並追回了因該產品所產生的營利$price。
  '撤銷廣告' //userId0將userId1發布的廣告「message」給撤銷了。
];

export const accuseLogTypeList = [
  '舉報違規',
  '禁止舉報',
  '禁止下單',
  '禁止聊天',
  '禁止廣告',
  '禁任經理',
  '課以罰款',
  '沒收股份',
  '解除舉報',
  '解除下單',
  '解除聊天',
  '解除廣告',
  '解除禁任',
  '退還罰款',
  '撤職紀錄',
  '查封關停',
  '解除查封',
  '產品下架',
  '撤銷廣告'
];

//schema
const schema = new SimpleSchema({
  //紀錄類別
  logType: {
    type: String,
    allowedValues: logTypeList
  },
  //紀錄相關者的userId陣列
  userId: {
    type: Array,
    optional: true
  },
  'userId.$': {
    type: String
  },
  //紀錄相關的公司ID
  companyId: {
    type: String,
    optional: true
  },
  //紀錄相關的訂單ID
  orderId: {
    type: String,
    optional: true
  },
  //紀錄相關的產品ID
  productId: {
    type: String,
    optional: true
  },
  //紀錄相關金額
  price: {
    type: SimpleSchema.Integer,
    optional: true
  },
  //紀錄相關數據
  amount: {
    type: Number,
    optional: true
  },
  //紀錄相關文字
  message: {
    type: String,
    min: 1,
    max: 255,
    optional: true
  },
  //紀錄日期
  createdAt: {
    type: Date
  }
});
dbLog.attachSchema(schema);
