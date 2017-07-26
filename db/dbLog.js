'use strict';
import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

//交易訂單資料集
export const dbLog = new Mongo.Collection('log');
export default dbLog;

export const logTypeList = [
  '發薪紀錄', //系統向username0發給了price的薪水
  '創立公司', //username0發起了companyName公司的創立計劃
  '參予投資', //username0向companyName公司的創立計劃投資了amount金額
  '創立失敗', //username...等人投資的companyName公司創立計劃由於投資人數不足失敗了
  '創立成功', //username...等人投資的companyName公司正式上市
  '創立得股', //username0因為投資了companyName公司的上市，得到了amount股份
  '購買下單', //username0想要用price購買amount的companyName股票
  '販賣下單', //username0想要用price販賣amount的companyName股票
  '取消下單', //username0取消了以price單價message(購入/賣出)amount數量的companyName股票的訂單
  '訂單完成', //username以price單價message(購入/賣出)amount數量的companyName股票的訂單已經交易完成
  '賣單撤銷', //由於無人接單，username0以price單價賣出amount數量的companyName股票的訂單被撤銷了
  '公司釋股', //companyName釋出了amount股票
  '交易紀錄', //username0以price的價格向(username1 || companyName)購買了amount數量的companyName股票
  '辭職紀錄', //username0辭去了companyName公司的經理人職務
  '參選紀錄', //username0競選companyName公司經理人
  '經理管理', //username0修改了companyName公司的資訊
  '產品發布', //username0發表了companyName公司的productId產品
  '產品下架', //username0下架了companyName公司的productId產品
  '推薦產品', //username0推薦了companyName公司的productId產品
  '支持紀錄', //username0支持username1擔任companyName公司的經理人
  '就任經理', //username0在message商業季度(以amount數量的支持股份)擊敗了所有競爭對手，成為companyName公司的經理人。
  '公司營利', //companyName公司本商業季度一共獲利amount
  '營利分紅', //username0得到了companyName公司的分紅amount
  '舉報公司', //username0以message理由舉報了companyName公司
  '舉報產品', //username0以message理由舉報了companyName公司的productId產品
  '公司撤銷', //username0以message理由撤銷了companyName公司
  '取消資格' //username0以message理由取消了username1擔任companyName公司經理人的資格
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
    type: String,
    regEx: /^[0-9a-zA-Z]{4,12}$/
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
  //紀錄日期
  createdAt: {
    type: Date
  }
});
dbLog.attachSchema(schema);
