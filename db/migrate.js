'use strict';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { MongoInternals } from 'meteor/mongo';
import { Migrations } from 'meteor/percolate:migrations';
import { Promise } from 'meteor/promise';

import { dbAdvertising } from './dbAdvertising';
import { dbArena } from './dbArena';
import { dbArenaFighters } from './dbArenaFighters';
import { dbCompanies } from './dbCompanies';
import { dbCompanyArchive } from './dbCompanyArchive';
import { dbCompanyStones } from './dbCompanyStones';
import { dbDirectors } from './dbDirectors';
import { dbEventSchedules } from './dbEventSchedules';
import { dbFoundations } from './dbFoundations';
import { dbLog, logTypeList } from './dbLog';
import { dbOrders } from './dbOrders';
import { dbPrice } from './dbPrice';
import { dbProducts } from './dbProducts';
import { dbRankCompanyPrice } from './dbRankCompanyPrice';
import { dbRankCompanyProfit } from './dbRankCompanyProfit';
import { dbRankCompanyValue } from './dbRankCompanyValue';
import { dbRankCompanyCapital } from './dbRankCompanyCapital';
import { dbRankUserWealth } from './dbRankUserWealth';
import { dbRound } from './dbRound';
import { dbRuleAgendas } from './dbRuleAgendas';
import { dbSeason } from './dbSeason';
import { dbTaxes } from './dbTaxes';
import { dbUserArchive } from './dbUserArchive';
import { dbUserOwnedProducts } from './dbUserOwnedProducts';
import { dbValidatingUsers } from './dbValidatingUsers';
import { dbVariables } from './dbVariables';
import { dbVips, roundVipScore } from './dbVips';
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
      dbDirectors.rawCollection().createIndex(
        {
          companyId: 1,
          userId: 1
        },
        {
          unique: true
        }
      );
      dbDirectors.rawCollection().createIndex({
        userId: 1
      });
      dbFoundations.rawCollection().createIndex({
        companyName: 1
      });
      dbFoundations.rawCollection().createIndex({
        createdAt: 1
      });
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
    name: 'add chairman/chairmanStocks into companies.',
    up() {
      dbCompanies
        .find(
          {},
          {
            fields: {
              _id: 1
            }
          }
        ).forEach((companyData) => {
          const chairmanData = dbDirectors.findOne(
            {
              companyId: companyData._id
            },
            {
              sort: {
                stocks: -1,
                createdAt: 1
              },
              fields: {
                userId: 1
              }
            }
          );
          if (chairmanData) {
            dbCompanies.update(companyData._id, {
              $set: {
                chairman: chairmanData._id
              }
            });
          }
        });
    }
  });

  Migrations.add({
    version: 3,
    name: 'users add profile.validateType field.',
    up() {
      Meteor.users.update(
        {
          'services.google': {
            $exists: true
          }
        },
        {
          $set: {
            'profile.validateType': 'Google'
          }
        },
        {
          multi: true
        }
      );
      Meteor.users.update(
        {
          'username': {
            $exists: true
          }
        },
        {
          $set: {
            'profile.validateType': 'PTT'
          }
        },
        {
          multi: true
        }
      );
    }
  });

  Migrations.add({
    version: 4,
    name: 'taxes index, users add lastSeasonTotalWealth and noLoginDayCount field.',
    up() {
      dbTaxes.rawCollection().createIndex({
        userId: 1
      });
      Meteor.users.update(
        {},
        {
          $set: {
            'profile.lastSeasonTotalWealth': 0,
            'profile.noLoginDayCount': 0
          }
        },
        {
          multi: true
        }
      );
    }
  });

  Migrations.add({
    version: 5,
    name: 'change !system director data to !FSC director data.',
    up() {
      dbDirectors.update(
        {
          userId: '!system'
        },
        {
          $set: {
            userId: '!FSC'
          }
        },
        {
          multi: true
        }
      );
    }
  });

  Migrations.add({
    version: 6,
    name: 'users add favorite',
    up() {
      Meteor.users.update(
        {},
        {
          $set: {
            favorite: []
          }
        },
        {
          multi: true
        }
      );
    }
  });

  Migrations.add({
    version: 7,
    name: 'season add companies count field.',
    up() {
      dbSeason.update(
        {},
        {
          $set: {
            companiesCount: 0
          }
        },
        {
          multi: true
        }
      );
    }
  });

  Migrations.add({
    version: 8,
    name: 're define dbProduct seasonId field.',
    up() {
      const seasonIdList = dbSeason
        .find({}, {
          sort: {
            beginDate: -1
          },
          fields: {
            _id: 1
          }
        })
        .map((seasonData) => {
          return seasonData._id;
        });
      _.each(seasonIdList, (seasonId, index) => {
        const shouldBeSeasonId = index > 0 ? seasonIdList[index - 1] : '';
        dbProducts.update(
          {
            seasonId: seasonId
          },
          {
            $set: {
              seasonId: shouldBeSeasonId
            }
          },
          {
            multi: true
          }
        );
      });
    }
  });

  Migrations.add({
    version: 9,
    name: 'company add salary, nextSeasonSalary and seasonalBonusPercent field.',
    up() {
      dbCompanies.update(
        {},
        {
          $set: {
            salary: Meteor.settings.public.defaultCompanySalaryPerDay,
            nextSeasonSalary: Meteor.settings.public.defaultCompanySalaryPerDay,
            seasonalBonusPercent: Meteor.settings.public.defaultSeasonalBonusPercent
          }
        },
        {
          multi: true
        }
      );
    }
  });

  Migrations.add({
    version: 10,
    name: 'ruleAgenda add creator field.',
    up() {
      dbRuleAgendas.find().forEach((agenda) => {
        dbRuleAgendas.update(
          {
            _id: agenda._id
          },
          {
            $set: {
              creator: agenda.proposer
            }
          }
        );
      });
    }
  });

  Migrations.add({
    version: 11,
    name: 'rename user.profile.lastReadFscAnnouncementDate to user.profile.lastReadAccuseLogDate',
    up() {
      Meteor.users.rawCollection().update({
        lastReadFscAnnouncementDate: { $exists: true }
      }, {
        $rename: { lastReadFscAnnouncementDate: 'lastReadAccuseLogDate' }
      });
    }
  });

  Migrations.add({
    version: 12,
    name: 'round system',
    up() {
      dbRound.rawCollection().createIndex({
        beginDate: -1
      });
      const firstSeasonData = dbSeason.findOne({}, {
        sort: {
          beginDate: 1
        }
      });
      let beginDate;
      if (firstSeasonData) {
        beginDate = firstSeasonData.beginDate;
      }
      else {
        beginDate = new Date();
      }
      const roundTime = Meteor.settings.public.seasonTime * Meteor.settings.public.seasonNumberInRound;
      const endDate = new Date(beginDate.setMinutes(0, 0, 0) + roundTime);
      dbRound.insert({ beginDate, endDate });

      if (dbCompanies.find().count()) {
        const companyArchiveBulk = dbCompanyArchive.rawCollection().initializeUnorderedBulkOp();
        dbCompanies
          .find({})
          .forEach((companyData) => {
            companyArchiveBulk.insert({
              _id: companyData._id,
              status: 'market',
              name: companyData.companyName,
              tags: companyData.tags,
              pictureSmall: companyData.pictureSmall,
              pictureBig: companyData.pictureBig,
              description: companyData.description
            });
          });
        companyArchiveBulk.execute();
      }
      if (dbFoundations.find().count()) {
        const companyArchiveBulk = dbCompanyArchive.rawCollection().initializeUnorderedBulkOp();
        dbFoundations
          .find()
          .forEach((companyData) => {
            companyArchiveBulk.insert({
              _id: companyData._id,
              status: 'foundation',
              name: companyData.companyName,
              tags: companyData.tags,
              pictureSmall: companyData.pictureSmall,
              pictureBig: companyData.pictureBig,
              description: companyData.description
            });
          });
        companyArchiveBulk.execute();
      }
      if (Meteor.users.find().count()) {
        const userBulk = Meteor.users.rawCollection().initializeUnorderedBulkOp();
        let hasGoogleUser = false;
        const userArchiveBulk = dbUserArchive.rawCollection().initializeUnorderedBulkOp();
        Meteor.users.find().forEach((userData) => {
          let userName = userData.profile.name;
          if (userData.profile.validateType === 'Google') {
            hasGoogleUser = true;
            userName = userData.services.google.email;
            userBulk
              .find({
                _id: userData._id
              })
              .updateOne({
                $set: {
                  'profile.name': userName
                }
              });
          }
          userArchiveBulk.insert({
            _id: userData._id,
            status: 'registered',
            name: userName,
            validateType: userData.profile.validateType,
            isAdmin: userData.profile.isAdmin,
            stone: userData.profile.stones.saint,
            ban: userData.profile.ban
          });
        });
        if (hasGoogleUser) {
          userBulk.execute();
        }
        userArchiveBulk.execute();
      }
      dbCompanyArchive.rawCollection().createIndex(
        {
          name: 1
        },
        {
          unique: true
        }
      );
      dbCompanyArchive.rawCollection().createIndex({
        status: 1
      });
      dbUserArchive.rawCollection().createIndex(
        {
          name: 1,
          validateType: 1
        },
        {
          unique: true
        }
      );
    }
  });

  Migrations.add({
    version: 13,
    name: 'arena system',
    up() {
      dbArena.rawCollection().createIndex({ beginDate: 1 });
      dbArenaFighters.rawCollection().createIndex({ arenaId: 1, companyId: 1 }, { unique: true });

      // 在有資料的狀況下，用最後一個賽季與該賽季的商業季度總數推導出最近一次亂鬥的資料
      const lastRound = dbRound.findOne({}, { sort: { beginDate: -1 } });
      if (! lastRound) {
        return;
      }

      const seasonCount = dbSeason
        .find({
          beginDate: { $gte: lastRound.beginDate },
          endDate: { $lte: lastRound.endDate }
        }, {
          sort: { beginDate: -1 }
        })
        .count();
      if (seasonCount < 1) {
        return;
      }

      const { seasonTime, arenaIntervalSeasonNumber, electManagerTime } = Meteor.settings.public;

      const lastSeasonData = dbSeason.findOne({}, { sort: { beginDate: -1 } });
      const { beginDate, endDate } = lastSeasonData;
      const arenaEndDate = new Date(endDate.getTime() + seasonTime * arenaIntervalSeasonNumber);
      dbArena.insert({
        beginDate: beginDate,
        endDate: arenaEndDate,
        joinEndDate: new Date(arenaEndDate.getTime() - electManagerTime),
        shuffledFighterCompanyIdList: []
      });

      dbVariables.set('arenaCounter', (arenaIntervalSeasonNumber + 1 - seasonCount) % (arenaIntervalSeasonNumber + 1));
    }
  });

  Migrations.add({
    version: 14,
    name: 'log - adjust schema & indexing logType',
    up() {
      dbLog.rawCollection().createIndex({ logType: 1, createdAt: -1 });

      const logBulk = dbLog.rawCollection().initializeUnorderedBulkOp();
      let runBulk = false;

      logTypeList.forEach((logType) => {
        // 跳過無資料的狀況
        if (dbLog.find({ logType, data: { $exists: false } }).count() === 0) {
          return;
        }

        const bulkCursor = logBulk.find({
          logType,
          data: { $exists: false }
        });

        // 將與 indexes 無關的 fields 移至 data，並重新給予適當名稱
        switch (logType) {
          case '驗證通過':
            bulkCursor.update({
              $rename: {
                price: 'data.money'
              }
            });
            runBulk = true;
            break;

          case '登入紀錄':
            bulkCursor.update({
              $rename: {
                message: 'data.ipAddr'
              }
            });
            runBulk = true;
            break;

          case '免費得石':
            bulkCursor.update({
              $rename: {
                message: 'data.reason',
                amount: 'data.stones'
              }
            });
            runBulk = true;
            break;

          case '聊天發言':
            bulkCursor.update({
              $rename: {
                message: 'data.message'
              }
            });
            runBulk = true;
            break;

          case '發薪紀錄':
            bulkCursor.update({
              $rename: {
                price: 'data.salary'
              }
            });
            runBulk = true;
            break;

          case '公司復活':
            bulkCursor.update({
              $rename: {
                message: 'data.manager'
              }
            });
            runBulk = true;
            break;

          case '創立公司':
            bulkCursor.update({
              $rename: {
                message: 'data.companyName'
              }
            });
            runBulk = true;
            break;

          case '參與投資':
            bulkCursor.update({
              $rename: {
                message: 'data.companyName',
                amount: 'data.fund'
              }
            });
            runBulk = true;
            break;

          case '創立失敗':
            bulkCursor.update({
              $rename: {
                message: 'data.companyName'
              }
            });
            runBulk = true;
            break;

          case '創立退款':
            bulkCursor.update({
              $rename: {
                message: 'data.companyName',
                amount: 'data.refund'
              }
            });
            runBulk = true;
            break;

          case '創立成功':
            bulkCursor.update({
              $rename: {
                price: 'data.price'
              }
            });
            runBulk = true;
            break;

          case '創立得股':
            bulkCursor.update({
              $rename: {
                price: 'data.fund',
                amount: 'data.stocks'
              }
            });
            runBulk = true;
            break;

          case '購買下單':
          case '販賣下單':
          case '公司釋股':
          case '交易紀錄':
            bulkCursor.update({
              $rename: {
                price: 'data.price',
                amount: 'data.amount'
              }
            });
            runBulk = true;
            break;

          case '取消下單':
          case '系統撤單':
          case '訂單完成':
            bulkCursor.update({
              $rename: {
                message: 'data.orderType',
                price: 'data.price',
                amount: 'data.amount'
              }
            });
            runBulk = true;
            break;

          case '就任經理':
            bulkCursor.update({
              $rename: {
                message: 'data.seasonName',
                amount: 'data.stocks'
              }
            });
            runBulk = true;
            break;

          case '推薦產品':
            bulkCursor.update({
              $rename: {
                productId: 'data.productId',
                price: 'data.profit'
              }
            });
            runBulk = true;
            break;

          case '員工營利':
            bulkCursor.update({
              $rename: {
                price: 'data.profit'
              }
            });
            runBulk = true;
            break;

          case '公司營利':
            bulkCursor.update({
              $rename: {
                amount: 'data.profit'
              }
            });
            runBulk = true;
            break;

          case '營利分紅':
            bulkCursor.update({
              $rename: {
                amount: 'data.bonus'
              }
            });
            runBulk = true;
            break;

          case '季度賦稅':
            bulkCursor.update({
              $rename: {
                amount: 'data.assetTax',
                price: 'data.zombieTax'
              }
            });
            runBulk = true;
            break;

          case '繳納稅金':
            bulkCursor.update({
              $rename: {
                amount: 'data.paid'
              }
            });
            runBulk = true;
            break;

          case '繳稅逾期':
            bulkCursor.update({
              $rename: {
                amount: 'data.fine'
              }
            });
            runBulk = true;
            break;

          case '繳稅沒金':
            bulkCursor.update({
              $rename: {
                amount: 'data.money'
              }
            });
            runBulk = true;
            break;

          case '繳稅沒收':
            bulkCursor.update({
              $rename: {
                price: 'data.price',
                amount: 'data.stocks'
              }
            });
            runBulk = true;
            break;

          case '廣告宣傳':
          case '廣告追加':
            bulkCursor.update({
              $rename: {
                price: 'data.cost',
                message: 'data.message'
              }
            });
            runBulk = true;
            break;

          case '舉報違規':
            dbLog
              .find({
                logType,
                data: { $exists: false }
              })
              .forEach((logData) => {
                logBulk
                  .find({ _id: new MongoInternals.NpmModule.ObjectID(logData._id._str) })
                  .update({
                    $rename: {
                      message: 'data.reason'
                    },
                    $set: {
                      'data.ipAddr': logData.userId[2],
                      userId: logData.userId.slice(0, 2)
                    }
                  });
              });
            runBulk = true;
            break;

          case '金管通告':
          case '通報金管':
            bulkCursor.update({
              $rename: {
                message: 'data.message'
              }
            });
            runBulk = true;
            break;

          case '禁止舉報':
          case '禁止下單':
          case '禁止聊天':
          case '禁止廣告':
          case '禁任經理':
          case '解除舉報':
          case '解除下單':
          case '解除聊天':
          case '解除廣告':
          case '解除禁任':
          case '查封關停':
          case '解除查封':
            bulkCursor.update({
              $rename: {
                message: 'data.reason'
              }
            });
            runBulk = true;
            break;

          case '課以罰款':
          case '退還罰款':
            bulkCursor.update({
              $rename: {
                message: 'data.reason',
                amount: 'data.fine'
              }
            });
            runBulk = true;
            break;

          case '沒收股份':
            bulkCursor.update({
              $rename: {
                message: 'data.reason',
                amount: 'data.stocks'
              }
            });
            runBulk = true;
            break;

          case '公司更名':
            bulkCursor.update({
              $rename: {
                message: 'data.oldCompanyName'
              }
            });
            runBulk = true;
            break;

          case '產品下架':
            bulkCursor.update({
              $rename: {
                productId: 'data.productId',
                message: 'data.reason',
                price: 'data.profit'
              }
            });
            runBulk = true;
            break;

          case '撤銷廣告':
            bulkCursor.update({
              $rename: {
                message: 'data.message'
              }
            });
            runBulk = true;
            break;

          case '亂鬥報名':
            break;

          case '亂鬥加強':
            bulkCursor.update({
              $rename: {
                message: 'data.attrName',
                amount: 'data.money'
              }
            });
            runBulk = true;
            break;

          case '亂鬥營利':
            bulkCursor.update({
              $rename: {
                amount: 'data.reward'
              }
            });
            runBulk = true;
            break;
        }
      });

      if (runBulk) {
        Meteor.wrapAsync(logBulk.execute).call(logBulk);
      }
    }
  });

  Migrations.add({
    version: 15,
    name: 'add company capital and grade; add company capital rank',
    up() {
      dbCompanies.rawCollection().createIndex({ capital: -1 }, {
        partialFilterExpression: { isSeal: false }
      });

      dbCompanies.rawCollection().createIndex({ grade: -1 }, {
        partialFilterExpression: { isSeal: false }
      });

      dbRankCompanyCapital.rawCollection().createIndex({ season: 1 });

      if (dbCompanies.find().count() <= 0) {
        return;
      }

      // 設定所有既存公司之評級為 D
      dbCompanies.update({}, { $set: { grade: 'D' } }, { multi: true });

      // 初始資本額 = 募得資金 = 初始配股 * 初始股價
      const initialCapitalMap = dbLog
        .aggregate([ {
          $match: {
            logType: { $in: ['創立得股', '創立成功'] }
          }
        }, {
          $group: {
            _id: '$companyId',
            stocks: { $sum: '$data.stocks' },
            price: { $sum: '$data.price' }
          }
        }, {
          $project: {
            initialCapital: { $multiply: ['$stocks', '$price'] }
          }
        } ])
        .reduce((obj, { _id, initialCapital }) => {
          obj[_id] = initialCapital;

          return obj;
        }, {});

      // 增加資本額 = Σ(釋股數量 * 釋股成交價格)
      const capitalIncreaseMap = dbLog
        .aggregate([ {
          $match: {
            logType: '交易紀錄',
            userId: { $size: 1 }
          }
        }, {
          $group: {
            _id: '$companyId',
            capitalIncrease: { $sum: { $multiply: ['$data.price', '$data.amount'] } }
          }
        } ])
        .reduce((obj, { _id, capitalIncrease }) => {
          obj[_id] = capitalIncrease;

          return obj;
        }, {});

      const companiesBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();

      const companyIds = Object.keys(initialCapitalMap);
      companyIds.forEach((companyId) => {
        const initialCapital = initialCapitalMap[companyId] || 0;
        const capitalIncrease = capitalIncreaseMap[companyId] || 0;
        const capital = initialCapital + capitalIncrease;

        companiesBulk.find({ _id: companyId }).updateOne({ $set: { capital } });
      });

      Meteor.wrapAsync(companiesBulk.execute).call(companiesBulk);
    }
  });

  Migrations.add({
    version: 16,
    name: 'add more stone types & company mining machine mechanism',
    up() {
      // 重新命名聖晶石欄位以擴充為多種石頭，並設定既有使用者的各種石頭數量
      Meteor.users.rawCollection().update({}, {
        $rename: { 'profile.stone': 'profile.stones.saint' },
        $set: {
          'profile.stones.birth': Meteor.settings.public.newUserBirthStones,
          'profile.stones.rainbow': 0,
          'profile.stones.rainbowFragment': 0,
          'profile.stones.quest': 0
        }
      }, { multi: true });

      // 重新命名使用者封存的聖晶石欄位（目前只有聖晶石會繼承）
      dbUserArchive.rawCollection().update({}, { $rename: { stone: 'saintStones' } }, { multi: true });

      // 挖礦機放置石頭資訊的 indexes
      dbCompanyStones.rawCollection().createIndex({ userId: 1 });
      dbCompanyStones.rawCollection().createIndex({ companyId: 1 });
      dbCompanyStones.rawCollection().createIndex({ stoneType: 1 });
      dbCompanyStones.rawCollection().createIndex({ placedAt: -1 });
    }
  });

  Migrations.add({
    version: 17,
    name: 'product system renew & refactor',
    up() {
      dbUserOwnedProducts.rawCollection().createIndex({ productId: 1, userId: 1 }, { unique: true });
      dbUserOwnedProducts.rawCollection().createIndex({ userId: 1, createdAt: 1 });
      dbUserOwnedProducts.rawCollection().createIndex({ companyId: 1, seasonId: 1 });

      // users
      // 改名 vote 為 voteTickets
      Meteor.users.rawCollection().update({}, { $rename: { 'profile.vote': 'profile.voteTickets' } }, { multi: true });

      // products
      // 改名 votes 為 voteCount
      dbProducts.rawCollection().update({}, { $rename: { votes: 'voteCount' } }, { multi: true });

      // 廢棄 overdue，改用 state
      const stateOverdueMap = {
        planning: 0,
        marketing: 1,
        ended: 2
      };

      Object.entries(stateOverdueMap).forEach(([state, overdue]) => {
        dbProducts.rawCollection().update({ overdue }, {
          $unset: { overdue: 0 },
          $set: { state }
        }, { multi: true });
      });

      // 設定所有產品為價格 1、數量 1，並設定庫存與現貨的預設值
      dbProducts.rawCollection().update({}, {
        $set: {
          price: 1,
          totalAmount: 1,
          stockAmount: 0,
          availableAmount: 0
        }
      }, { multi: true });

      // 記錄過去推薦票造成的營利至 profit 欄位
      dbProducts.rawCollection()
        .update({}, { $set: { profit: 0 } }, { multi: true }) // 預設值
        .then(() => {
          const productProfitMap = dbLog
            .aggregate([ {
              $match: { logType: '推薦產品', 'data.profit': { $exists: true } }
            }, {
              $group: { _id: '$data.productId', profit: { $sum: '$data.profit' } }
            } ])
            .reduce((obj, { _id, profit }) => {
              obj[_id] = profit;

              return obj;
            }, {});

          if (_.isEmpty(productProfitMap)) {
            return;
          }

          const productBulk = dbProducts.rawCollection().initializeUnorderedBulkOp();
          Object.entries(productProfitMap).forEach(([productId, profit]) => {
            productBulk.find({ _id: productId }).updateOne({ $set: { profit } });
          });

          return productBulk.execute();
        });


      // companies
      // 給予現存所有公司資本額 70% 為生產資金（扣除待上架總產品數量）、設定售價上限為目前參考價
      const companyUpdateModifierMap = {};
      dbCompanies.find().forEach(({ _id: companyId, listPrice, capital }) => {
        const productCount = dbProducts.find({ state: 'planning', companyId }).count();
        companyUpdateModifierMap[companyId] = {
          $set: {
            productionFund: Math.round(capital * 0.7) - productCount,
            productPriceLimit: listPrice
          }
        };
      });

      if (! _.isEmpty(companyUpdateModifierMap)) {
        const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
        Object.entries(companyUpdateModifierMap).forEach(([companyId, modifier]) => {
          companyBulk.find({ _id: companyId }).updateOne(modifier);
        });
        Meteor.wrapAsync(companyBulk.execute).call(companyBulk);
      }

      // 更新 indexes
      Promise.all([
        dbProducts.rawCollection().dropIndex({ overdue: 1 }),
        dbProducts.rawCollection().dropIndex({ companyId: 1, overdue: 1 }),
        dbProducts.rawCollection().dropIndex({ seasonId: 1, votes: -1 }),
        dbProducts.rawCollection().dropIndex({ companyId: 1, likeCount: -1 })
      ])
        .then(() => {
          dbProducts.rawCollection().createIndex({ state: 1 });
          dbProducts.rawCollection().createIndex({ companyId: 1, state: 1 });
          dbProducts.rawCollection().createIndex({ seasonId: 1, voteCount: -1 }, {
            partialFilterExpression: { $and: [ { state: 'marketing' }, { state: 'ended' } ] }
          });
        });

      // 排程最後出清時間
      const currentSeason = dbSeason.findOne({}, { sort: { beginDate: -1 } });
      if (currentSeason) {
        dbEventSchedules.upsert({ _id: 'product.finalSale' }, {
          $set: {
            scheduledAt: new Date(currentSeason.endDate.getTime() - Meteor.settings.public.productFinalSaleTime)
          }
        });
      }
    }
  });

  Migrations.add({
    version: 18,
    name: 'add product vouchers',
    up() {
      // 設定所有現有使用者的消費券為 0
      Meteor.users.rawCollection().update({}, {
        $set: { 'profile.vouchers': 0 }
      }, { multi: true });

      // 購買產品紀錄的花費欄位擴增為現金與消費券兩個
      dbLog.rawCollection().update({ logType: '購買產品', cost: { $exists: true } }, {
        $rename: { 'data.cost': 'data.moneyCost' },
        $set: { 'data.voucherCost': 0 }
      });
    }
  });

  Migrations.add({
    version: 19,
    name: 'add company VIP system',
    up() {
      // 建立 VIP 資訊的 indexes
      dbVips.rawCollection().createIndex({ userId: 1, companyId: 1 }, { unique: true });
      dbVips.rawCollection().createIndex({ companyId: 1, score: -1, createdAt: -1 });
      dbVips.rawCollection().createIndex({ companyId: 1, level: -1 });
      dbVips.rawCollection().createIndex({ userId: 1, level: -1 });

      // 增加當季公司產品對價格的 index（產品購買分數計算用）
      dbProducts.rawCollection().createIndex({ seasonId: 1, companyId: 1, price: 1 }, {
        partialFilterExpression: { state: 'marketing' }
      });

      const seasons = dbSeason.find({}, { sort: { beginDate: -1 } }).fetch();
      if (seasons.length === 0) {
        return;
      }

      const { _id: currentSeasonId } = seasons[0];

      /**
       * 處理過去的產品購買分數
       * 當季：以 1 倍計算
       * 過去所有季度：以 0.8 倍計算
       */
      const vipScoreMap = {};

      seasons.forEach(({ _id: seasonId }) => {
        // 該季度各公司的產品價格最高與最低值
        const companyProductPriceMinMaxMap = dbProducts
          .aggregate([ {
            $match: { seasonId }
          }, {
            $group: {
              _id: '$companyId',
              min: { $min: '$price' },
              max: { $max: '$price' }
            }
          } ])
          .reduce((obj, { _id, min, max }) => {
            obj[_id] = { min, max };

            return obj;
          }, {});

        // 以玩家持有的產品來回推 VIP 分數
        dbUserOwnedProducts
          .find({ seasonId })
          .forEach(({ userId, companyId, price, amount }) => {
            const { min: priceMin, max: priceMax } = companyProductPriceMinMaxMap[companyId];

            const seasonScoreFactor = seasonId === currentSeasonId ? 1.0 : 0.8;

            const totalCost = price * amount;
            const scoreFactor = priceMin === priceMax ? 1 : 1 + 0.2 * (price - priceMin) / (priceMax - priceMin);
            const scoreIncrease = totalCost * scoreFactor * seasonScoreFactor;

            if (scoreIncrease > 0) {
              _.defaults(vipScoreMap, { [userId]: {} });
              const oldScore = vipScoreMap[userId][companyId] || 0;
              const newScore = roundVipScore(oldScore + scoreIncrease);
              vipScoreMap[userId][companyId] = newScore;
            }
          });
      });

      if (_.isEmpty(vipScoreMap)) {
        return;
      }

      // 計算每個玩家在公司的第一次購買產品時間
      const firstBoughtDateMap = dbLog
        .aggregate([ {
          $match: { logType: '購買產品' }
        }, {
          $unwind: '$userId'
        }, {
          $group: {
            _id: { userId: '$userId', companyId: '$companyId' },
            firstBoughtAt: { $min: '$createdAt' }
          }
        } ])
        .reduce((obj, { _id, firstBoughtAt }) => {
          const { userId, companyId } = _id;
          _.defaults(obj, { [userId]: {} });
          obj[userId][companyId] = firstBoughtAt;

          return obj;
        }, {});

      const vipBulk = dbVips.rawCollection().initializeUnorderedBulkOp();

      Object.entries(vipScoreMap).forEach(([userId, subMap]) => {
        Object.entries(subMap).forEach(([companyId, score]) => {
          vipBulk.insert({
            userId,
            companyId,
            score,
            level: 0,
            createdAt: firstBoughtDateMap[userId][companyId]
          });
        });
      });

      Meteor.wrapAsync(vipBulk.execute, vipBulk)();
    }
  });

  Migrations.add({
    version: 20,
    name: 'log - remove place/retrieve stone log',
    up() {
      // 移除礦機的放石 / 取石 log
      dbLog.rawCollection().remove({ logType: { $in: ['礦機放石', '礦機取石'] } });
    }
  });

  Migrations.add({
    version: 21,
    name: 'product - refine production fund computation',
    up() {
      // 將生產資金欄位重新命名為基礎生產資金
      Promise.await(dbCompanies.rawCollection().update({}, { $rename: { productionFund: 'baseProductionFund' } }, { multi: true }));

      // 歸零所有公司的基礎生產資金
      dbCompanies.update({}, { $set: { baseProductionFund: 0 } }, { multi: true });

      // 更新所有公司的基礎生產資金為最近一季營利額之 10%
      const baseProductionFundMap = {};

      dbLog
        .aggregate([ {
          $match: { logType: '公司營利' }
        }, {
          $sort: { createdAt: -1 }
        }, {
          $group: {
            _id: '$companyId',
            previousSeasonProfit: { $first: '$data.profit' }
          }
        } ])
        .forEach(({ _id: companyId, previousSeasonProfit }) => {
          baseProductionFundMap[companyId] = Math.round(previousSeasonProfit * 0.1);
        });

      if (! _.isEmpty(baseProductionFundMap)) {
        const companyBulk = dbCompanies.rawCollection().initializeUnorderedBulkOp();
        Object.entries(baseProductionFundMap).forEach(([companyId, baseProductionFund]) => {
          companyBulk.find({ _id: companyId }).updateOne({ $set: { baseProductionFund } });
        });
        Meteor.wrapAsync(companyBulk.execute, companyBulk)();
      }
    }
  });

  Meteor.startup(() => {
    Migrations.migrateTo('latest');
  });
}
