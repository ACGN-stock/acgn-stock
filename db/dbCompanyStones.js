import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

// 石頭種類列表
export const stoneTypeList = [
  'saint', // 聖晶石
  'birth', // 誕生石
  'rainbow', // 彩虹石
  'rainbowFragment', // 彩紅石碎片
  'quest' // 任務石
];

// 石頭生產值
export const stonePowerTable = {
  saint: 0.5,
  birth: 1,
  rainbow: 5,
  rainbowFragment: 2,
  quest: 0.5
};

// 公司挖礦機石頭放置資料集
export const dbCompanyStones = new Mongo.Collection('companyStones', { idGeneration: 'MONGO' });

const schema = new SimpleSchema({
  // 公司id
  companyId: {
    type: String
  },
  // 放置者userId
  userId: {
    type: String
  },
  // 石頭種類
  stoneType: {
    type: String,
    allowedValues: stoneTypeList
  },
  // 放置時間
  placedAt: {
    type: Date
  }
});

export function stoneDisplayName(stoneType) {
  switch (stoneType) {
    case 'saint':
      return '聖晶石';
    case 'birth':
      return '誕生石';
    case 'rainbow':
      return '彩虹石';
    case 'rainbowFragment':
      return '彩虹石碎片';
    case 'quest':
      return '任務石';
    default:
      return `未知的石頭(${stoneType})`;
  }
}

dbCompanyStones.attachSchema(schema);
