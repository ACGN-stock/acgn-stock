'use strict';
import { Meteor } from 'meteor/meteor';
import { Migrations } from 'meteor/percolate:migrations';
import { dbAdvertising } from './dbAdvertising';
import { dbCompanies } from './dbCompanies';
import { dbDirectors } from './dbDirectors';
import { dbFoundations } from './dbFoundations';
import { dbLog } from './dbLog';
import { dbOrders } from './dbOrders';
import { dbPrice } from './dbPrice';
import { dbProducts } from './dbProducts';
import { dbProductLike } from './dbProductLike';
import { dbRankCompanyPrice } from './dbRankCompanyPrice';
import { dbRankCompanyProfit } from './dbRankCompanyProfit';
import { dbRankCompanyValue } from './dbRankCompanyValue';
import { dbRankUserWealth } from './dbRankUserWealth';
import { dbSeason } from './dbSeason';
import { dbValidatingUsers } from './dbValidatingUsers';
import { dbVoteRecord } from './dbVoteRecord';

if (Meteor.isServer) {
  Migrations.add({
    version: 1,
    name: 'Create indexes.',
    up() {
      dbAdvertising.rawCollection().createIndex({
        paid: -1
      });
      dbCompanies.rawCollection().createIndex({
        companyName: 1
      });
      dbCompanies.rawCollection().createIndex(
        {
          lastPrice: -1
        },
        {
          partialFilterExpression: {
            isSeal: false
          }
        }
      );
      dbCompanies.rawCollection().createIndex(
        {
          listPrice: -1
        },
        {
          partialFilterExpression: {
            isSeal: false
          }
        }
      );
      dbCompanies.rawCollection().createIndex(
        {
          totalValue: -1
        },
        {
          partialFilterExpression: {
            isSeal: false
          }
        }
      );
      dbCompanies.rawCollection().createIndex(
        {
          profit: -1
        },
        {
          partialFilterExpression: {
            isSeal: false
          }
        }
      );
      dbCompanies.rawCollection().createIndex(
        {
          createdAt: -1
        },
        {
          partialFilterExpression: {
            isSeal: false
          }
        }
      );
      dbCompanies.rawCollection().createIndex(
        {
          manager: 1
        },
        {
          partialFilterExpression: {
            isSeal: false
          }
        }
      );
      dbDirectors.rawCollection().createIndex({
        companyId: 1,
        stocks: -1,
        createdAt: 1
      });
      dbDirectors.rawCollection().createIndex({
        companyId: 1,
        userId: 1
      });
      dbDirectors.rawCollection().createIndex({
        userId: 1
      });
      dbFoundations.rawCollection().createIndex({
        companyName: 1
      });
      dbFoundations.rawCollection().createIndex({
        createdAt: 1
      });
      dbLog.rawCollection().createIndex(
        {
          companyId: 1,
          createdAt: -1
        },
        {
          partialFilterExpression: {
            logType: '交易紀錄'
          }
        }
      );
      dbLog.rawCollection().createIndex(
        {
          createdAt: 1
        },
        {
          partialFilterExpression: {
            logType: '聊天發言'
          }
        }
      );
      dbLog.rawCollection().createIndex({
        createdAt: -1
      });
      dbLog.rawCollection().createIndex({
        companyId: 1,
        createdAt: -1
      });
      dbLog.rawCollection().createIndex({
        userId: 1,
        createdAt: -1
      });
      dbLog.rawCollection().createIndex(
        {
          createdAt: -1
        },
        {
          partialFilterExpression: {
            logType: {
              $in: [
                '舉報違規',
                '禁止舉報',
                '禁止下單',
                '禁止聊天',
                '禁止廣告',
                '禁任經理',
                '課以罰款',
                '解除舉報',
                '解除下單',
                '解除聊天',
                '解除廣告',
                '解除禁任',
                '退還罰款',
                '撤職紀錄',
                '查封關停',
                '解除查封',
                '產品下架'
              ]
            }
          }
        }
      );
      dbOrders.rawCollection().createIndex({
        companyId: 1,
        userId: 1
      });
      dbOrders.rawCollection().createIndex(
        {
          companyId: 1,
          unitPrice: -1,
          createdAt: 1
        },
        {
          partialFilterExpression: {
            orderType: '購入'
          }
        }
      );
      dbOrders.rawCollection().createIndex(
        {
          companyId: 1,
          unitPrice: 1,
          createdAt: 1
        },
        {
          partialFilterExpression: {
            orderType: '賣出'
          }
        }
      );
      dbOrders.rawCollection().createIndex({
        userId: 1
      });
      dbPrice.rawCollection().createIndex({
        companyId: 1,
        createdAt: -1
      });
      dbPrice.rawCollection().createIndex({
        createdAt: 1
      });
      dbProducts.rawCollection().createIndex({
        overdue: 1
      });
      dbProducts.rawCollection().createIndex({
        companyId: 1,
        overdue: 1
      });
      dbProducts.rawCollection().createIndex(
        {
          seasonId: 1,
          votes: -1
        },
        {
          partialFilterExpression: {
            overdue: {
              $gt: 0
            }
          }
        }
      );
      dbProducts.rawCollection().createIndex(
        {
          companyId: 1,
          likeCount: -1
        },
        {
          partialFilterExpression: {
            overdue: {
              $gt: 0
            }
          }
        }
      );
      dbProductLike.rawCollection().createIndex({
        companyId: 1,
        userId: 1
      });
      dbRankCompanyPrice.rawCollection().createIndex({
        season: 1
      });
      dbRankCompanyProfit.rawCollection().createIndex({
        season: 1
      });
      dbRankCompanyValue.rawCollection().createIndex({
        season: 1
      });
      dbRankUserWealth.rawCollection().createIndex({
        season: 1
      });
      dbSeason.rawCollection().createIndex({
        beginDate: -1
      });
      dbValidatingUsers.rawCollection().createIndex({
        username: 1
      });
      dbVoteRecord.rawCollection().createIndex(
        {
          companyId: 1,
          userId: 1
        },
        {
          unique: true
        }
      );
    }
  });

  Migrations.add({
    version: 2,
    name: 're index accuse log.',
    up() {
      dbLog.rawCollection().dropIndex(
        {
          createdAt: -1
        },
        {
          partialFilterExpression: {
            logType: {
              $in: [
                '舉報違規',
                '禁止舉報',
                '禁止下單',
                '禁止聊天',
                '禁止廣告',
                '禁任經理',
                '課以罰款',
                '解除舉報',
                '解除下單',
                '解除聊天',
                '解除廣告',
                '解除禁任',
                '退還罰款',
                '撤職紀錄',
                '查封關停',
                '解除查封',
                '產品下架'
              ]
            }
          }
        }
      );
      dbLog.rawCollection().createIndex(
        {
          createdAt: -1
        },
        {
          partialFilterExpression: {
            logType: {
              $in: [
                '舉報違規',
                '禁止舉報',
                '禁止下單',
                '禁止聊天',
                '禁止廣告',
                '禁任經理',
                '課以罰款',
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
              ]
            }
          }
        }
      );
    }
  });

  Meteor.startup(() => {
    Migrations.migrateTo('latest');
  });
}
