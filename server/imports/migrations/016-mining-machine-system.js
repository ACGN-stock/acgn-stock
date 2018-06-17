import { Meteor } from 'meteor/meteor';

import { defineMigration } from '/server/imports/utils/defineMigration';
import { dbCompanyStones } from '/db/dbCompanyStones';
import { dbUserArchive } from '/db/dbUserArchive';

defineMigration({
  version: 16,
  name: 'add more stone types & company mining machine mechanism',
  async up() {
    // 重新命名聖晶石欄位以擴充為多種石頭，並設定既有使用者的各種石頭數量
    await Meteor.users.rawCollection().update({}, {
      $rename: { 'profile.stone': 'profile.stones.saint' },
      $set: {
        'profile.stones.birth': Meteor.settings.public.newUserBirthStones,
        'profile.stones.rainbow': 0,
        'profile.stones.rainbowFragment': 0,
        'profile.stones.quest': 0
      }
    }, { multi: true });

    // 重新命名使用者封存的聖晶石欄位（目前只有聖晶石會繼承）
    await dbUserArchive.rawCollection().update({}, { $rename: { stone: 'saintStones' } }, { multi: true });

    // 挖礦機放置石頭資訊的 indexes
    await Promise.all([
      dbCompanyStones.rawCollection().createIndex({ userId: 1 }),
      dbCompanyStones.rawCollection().createIndex({ companyId: 1 }),
      dbCompanyStones.rawCollection().createIndex({ stoneType: 1 }),
      dbCompanyStones.rawCollection().createIndex({ placedAt: -1 })
    ]);
  }
});
