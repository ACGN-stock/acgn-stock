'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//交易訂單資料集
export const dbLog = new Mongo.Collection('log');
export default dbLog;

export const logTypeList = [
  '驗證通過', //帳號驗證通過，領取起始資金$price。
  '發薪紀錄', //系統向username0發給了price的薪水！
  '創立公司', //username0發起了「companyName」的新公司創立計劃，誠意邀請有意者投資！
  '參與投資', //username0向「companyName公司創立計劃」投資了$amount！
  '創立失敗', //username...等人投資的「companyName公司創立計劃」由於投資人數不足失敗了，投資金額將全數返回！
  '創立成功', //username...等人投資的「companyName公司創立計劃」成功了，該公司正式上市，初始股價為$price！
  '創立得股', //(username0)對「companyName公司創立計劃」的投資為你帶來了amount數量的公司股票！
  '購買下單', //username0想要用每股$price的單價購買amount數量的「companyName」公司股票！
  '販賣下單', //username0想要用每股$price的單價販賣amount數量的「companyName」公司股票！
  '取消下單', //username0取消了以每股$price單價message(購入/賣出)amount數量的companyName股票的訂單！
  '訂單完成', //username0以每股$price的單價message(購入/賣出)amount數量的「companyName」公司股票的訂單已經全數交易完畢！
  '公司釋股', //由於大量的高價買單需求，「companyName」公司釋出了amount數量的股票！
  '交易紀錄', //username0以$price的單價向(username1 || companyName)購買了amount數量的「companyName」公司股票！
  '辭職紀錄', //username0辭去了「companyName」公司的經理人職務！
  '參選紀錄', //username0開始競選「companyName」公司的經理人職務！
  '經理管理', //username0修改了「companyName」公司的資訊！
  '推薦產品', //username0推薦了「companyName」公司的#productId產品！
  '支持紀錄', //username0支持username1擔任「companyName」公司的經理人！
  '就任經理', //username0在message商業季度(以amount數量的支持股份)擊敗了所有競爭對手，取代username1成為「companyName」公司的經理人！
  '公司營利', //「companyName」公司本商業季度一共獲利$amount！
  '營利分紅', //username0得到了「companyName」公司的分紅$amount！
  '舉報公司', //username0以「message」理由舉報了「companyName」公司！
  '舉報產品', //username0以「message」理由舉報了「companyName」公司的#productId產品！
  '公司撤銷', //username0以「message」理由撤銷了「companyName」公司！
  '取消資格' //username0以「message」理由取消了username1擔任經理人的資格！
];

//schema
const schema = new SimpleSchema({
  //紀錄類別
  logType: {
    type: String,
    allowedValues: logTypeList
  },
  //紀錄相關者的PTT帳號
  username: {
    type: Array,
    optional: true
  },
  'username.$': {
    type: String
  },
  //紀錄相關的公司ID
  companyName: {
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
  //是否已被即時訊息處理
  resolve: {
    type: Boolean,
    defaultValue: false
  },
  //紀錄日期
  createdAt: {
    type: Date
  }
});
dbLog.attachSchema(schema);
