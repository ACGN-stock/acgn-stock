import { Meteor } from 'meteor/meteor';
import { Match } from 'meteor/check';
import SimpleSchema from 'simpl-schema';

import { stoneTypeList } from './dbCompanyStones';

export const banTypeList = [
  'accuse', // 所有舉報違規行為
  'deal', // 所有投資下單行為
  'chat', // 所有聊天發言行為
  'advertise', // 所有廣告宣傳行為
  'editUserAbout', // 編輯個人簡介
  'manager' // 擔任經理人的資格
];

export function banTypeDescription(banType) {
  switch (banType) {
    case 'accuse':
      return '所有舉報違規行為';
    case 'deal':
      return '所有投資下單行為';
    case 'chat':
      return '所有聊天發言行為';
    case 'advertise':
      return '所有廣告宣傳行為';
    case 'editUserAbout':
      return '編輯個人簡介';
    case 'manager':
      return '擔任經理人的資格';
    default:
      return `未知的行為(${banType})`;
  }
}

export const userRoleMap = {
  superAdmin: {
    displayName: '超級管理員'
  },
  generalManager: {
    displayName: '營運總管'
  },
  developer: {
    displayName: '工程部成員',
    manageableBy: ['generalManager']
  },
  planner: {
    displayName: '企劃部成員',
    manageableBy: ['generalManager']
  },
  fscMember: {
    displayName: '金管會成員',
    manageableBy: ['generalManager']
  }
};

export function getManageableRoles(user) {
  // 超級管理員可管理所有除自身以外的身份組
  if (hasRole(user, 'superAdmin')) {
    return Object.keys(userRoleMap).filter((role) => {
      return role !== 'superAdmin';
    });
  }

  // 其餘身份組由 userRoleMap 的設定來決定
  return Object.entries(userRoleMap)
    .filter(([, { manageableBy } ]) => {
      return manageableBy && hasAnyRoles(user, ...manageableBy);
    })
    .map(([role]) => {
      return role;
    });
}

export function isRoleManageable(user, role) {
  // 超級管理員可管理所有除自身以外的身份組
  if (hasRole(user, 'superAdmin')) {
    return role !== 'superAdmin';
  }

  return getManageableRoles(user).includes(role);
}

export function hasRole(user, role) {
  return user && user.profile && user.profile.roles && user.profile.roles.includes(role);
}

export function hasAnyRoles(user, ...roles) {
  return user && user.profile && user.profile.roles && roles.some((role) => {
    return user.profile.roles.includes(role);
  });
}

export function hasAllRoles(user, ...roles) {
  return user && user.profile && user.profile.roles && roles.every((role) => {
    return user.profile.roles.includes(role);
  });
}

export function roleDisplayName(role) {
  return (userRoleMap[role] || { displayName: `未知的身份組成員(${role})` }).displayName;
}

export function hasBanned(user, permission) {
  return user && user.profile && user.profile.ban && user.profile.ban.includes(permission);
}

const schema = new SimpleSchema({
  // 使用者PTT帳號名稱
  username: {
    type: String,
    optional: true
  },
  // 驗證成功日期
  createdAt: {
    type: Date
  },
  // 登入token紀錄
  services: {
    type: Object,
    optional: true,
    blackbox: true
  },
  favorite: {
    type: Array,
    defaultValue: []
  },
  'favorite.$': {
    type: String
  },
  profile: {
    type: new SimpleSchema({
      // 驗證類別
      validateType: {
        type: String,
        allowedValues: ['Google', 'PTT', 'Bahamut']
      },
      // 使用者名稱
      name: {
        type: String
      },
      // 金錢數量
      money: {
        type: SimpleSchema.Integer,
        defaultValue: 0
      },
      // 上季財富額
      lastSeasonTotalWealth: {
        type: SimpleSchema.Integer,
        defaultValue: 0
      },
      // 推薦票數量
      voteTickets: {
        type: SimpleSchema.Integer,
        min: 0,
        defaultValue: 0
      },
      // 消費券的數量
      vouchers: {
        type: SimpleSchema.Integer,
        min: 0,
        defaultValue: Meteor.settings.public.productVoucherAmount
      },
      // 各類石頭的數量
      stones: {
        type: new SimpleSchema(stoneTypeList.reduce((obj, stoneType) => {
          obj[stoneType] = {
            type: SimpleSchema.Integer,
            min: 0,
            defaultValue: 0
          };

          return obj;
        }, {})),
        defaultValue: {}
      },
      // 是否處於繳稅逾期的狀態
      notPayTax: {
        type: Boolean,
        defaultValue: false
      },
      // 被禁止的權限
      ban: {
        type: Array,
        defaultValue: []
      },
      'ban.$': {
        type: new Match.OneOf(...banTypeList)
      },
      // 未登入天數次數紀錄
      noLoginDayCount: {
        type: SimpleSchema.Integer,
        defaultValue: 0
      },
      // 是否處於渡假模式
      isInVacation: {
        type: Boolean,
        defaultValue: false
      },
      // 是否將要收假
      isEndingVacation: {
        type: Boolean,
        defaultValue: false
      },
      // 最後一次假期的開始時間
      lastVacationStartDate: {
        type: Date,
        optional: true
      },
      // 最後一次假期的結束時間
      lastVacationEndDate: {
        type: Date,
        optional: true
      },
      // 使用者的系統權限組
      roles: {
        type: Array,
        defaultValue: []
      },
      'roles.$': {
        type: String,
        allowedValues: Object.keys(userRoleMap)
      }
    })
  },
  about: {
    type: new SimpleSchema({
      description: {
        type: String,
        max: 300,
        defaultValue: ''
      },
      picture: {
        type: String,
        regEx: SimpleSchema.RegEx.Url,
        max: 1000,
        optional: true
      }
    }),
    defaultValue: { description: '' }
  },
  // user-status 的欄位定義
  status: {
    type: new SimpleSchema({
      // 是否為上線狀態
      online: {
        type: Boolean,
        optional: true
      },
      // 是否發呆中
      idle: {
        type: Boolean,
        optional: true
      },
      // 最後活動時間
      lastActivity: {
        type: Date,
        optional: true
      },
      // 最後上線資訊
      lastLogin: {
        type: new SimpleSchema({
          // 日期
          date: {
            type: Date,
            optional: true
          },
          // IP地址
          ipAddr: {
            type: String,
            optional: true
          },
          // 使用瀏覽器
          userAgent: {
            type: String,
            optional: true
          }
        }),
        optional: true
      }
    }),
    optional: true
  },
  // In order to avoid an 'Exception in setInterval callback' from Meteor
  heartbeat: {
    type: Date,
    optional: true
  }
});
Meteor.users.attachSchema(schema);

Meteor.users.findByIdOrThrow = function(id, options) {
  const result = this.findOne(id, options);
  if (! result) {
    throw new Meteor.Error(404, `找不到識別碼為「${id}」的使用者！`);
  }

  return result;
};

/*
 * 防止直接從 client 端操作 collection 來更新數值（尤其是 profile 欄位）
 * 參照 https://guide.meteor.com/accounts.html#dont-use-profile
 */
Meteor.users.deny({
  update() {
    return true;
  }
});
