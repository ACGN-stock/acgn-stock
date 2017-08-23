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
  '取消下單', //userId0取消了以每股$price單價message(購入/賣出)amount數量的companyId股票的訂單！
  '訂單完成', //userId0以每股$price的單價message(購入/賣出)amount數量的「companyId」公司股票的訂單已經全數交易完畢！
  '公司釋股', //「companyId」公司以$price的價格釋出amount數量的股票到市場上套取利潤！
  '交易紀錄', //userId0以$price的單價向(userId1 || companyId)購買了amount數量的「companyId」公司股票！
  '辭職紀錄', //userId0辭去了「companyId」公司的經理人職務！
  '參選紀錄', //userId0開始競選「companyId」公司的經理人職務！
  '支持紀錄', //userId0支持userId1擔任「companyId」公司的經理人！
  '就任經理', //userId0在message商業季度(以amount數量的支持股份)擊敗了所有競爭對手，取代userId1成為「companyId」公司的經理人！
  '經理管理', //userId0修改了「companyId」公司的資訊！
  '推薦產品', //userId0推薦了#productId產品，使「companyId」公司獲得了$price的營利額！
  '公司營利', //「companyId」公司本商業季度一共獲利$amount！
  '營利分紅', //userId0得到了「companyId」公司的分紅$amount！
  '廣告宣傳', //userId0以$price的價格發布了一則廣告：「message」。
  '廣告追加' //userId0追加了$price的廣告費用在廣告：「message」上。
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
    defaultValue: 0
  },
  //紀錄相關數據
  amount: {
    type: Number,
    defaultValue: 0
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
