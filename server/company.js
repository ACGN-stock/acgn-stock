'use strict';
import { _ } from 'meteor/underscore';
import { resourceManager } from './resourceManager';
import { changeStocksAmount, resolveOrder, updateCompanyLastPrice } from './methods/order';
import { dbCompanies } from '../db/dbCompanies';
import { dbOrders } from '../db/dbOrders';
import { dbDirectors } from '../db/dbDirectors';
import { dbLog } from '../db/dbLog';
import { dbConfig } from '../db/dbConfig';
import { config } from '../config';

let releaseStocksCounter = config.releaseStocksCounter;
export function releaseStocks() {
  releaseStocksCounter -= 1;
  if (releaseStocksCounter <= 0) {
    releaseStocksCounter = config.releaseStocksCounter;
    const maxPriceCompany = dbCompanies.findOne({}, {
      sort: {
        lastPrice: -1
      }
    });
    if (maxPriceCompany) {
      //釋股門檻價格
      const threshold = Math.round(maxPriceCompany.lastPrice / 2);
      dbCompanies
        .find(
          {
            lastPrice: {
              $gt: threshold
            }
          },
          {
            disableOplog: true
          }
        )
        .forEach((companyData) => {
          const companyName = companyData.companyName;
          let releaseChance = 0;
          let needAmount = 0;
          dbOrders
            .find(
              {
                orderType: '購入',
                unitPrice: {
                  $gt: threshold
                }
              },
              {
                disableOplog: true
              }
            )
            .forEach((orderData) => {
              needAmount += orderData.amount;
              releaseChance += (orderData.unitPrice - threshold) * orderData.amount;
            });

          if (Math.random() * releaseChance > config.releaseStocksChance) {
            const totalReleaseStocks =  Math.round(Math.random() * needAmount / 2);
            if (totalReleaseStocks > 0) {
              //先鎖定資源
              resourceManager.request('releaseStocks', ['companyOrder' + companyName], (release) => {
                dbLog.insert({
                  logType: '公司釋股',
                  companyName: companyName,
                  amount: totalReleaseStocks,
                  createdAt: new Date()
                });
                let lastPrice = companyData.lastPrice;
                let alreadyReleaseStocks = 0;
                dbOrders
                  .find(
                    {
                      orderType: '購入'
                    },
                    {
                      sort: {
                        unitPrice: -1
                      },
                      disableOplog: true
                    }
                  )
                  .forEach((buyOrderData) => {
                    if (alreadyReleaseStocks > totalReleaseStocks) {
                      return true;
                    }
                    const tradeNumber = Math.min(totalReleaseStocks - alreadyReleaseStocks, buyOrderData.amount - buyOrderData.done);
                    alreadyReleaseStocks += tradeNumber;
                    lastPrice = buyOrderData.unitPrice;
                    dbLog.insert({
                      logType: '交易紀錄',
                      username: [buyOrderData.username],
                      companyName: companyName,
                      price: buyOrderData.unitPrice,
                      amount: tradeNumber,
                      createdAt: new Date()
                    });
                    changeStocksAmount(buyOrderData.username, companyName, tradeNumber);
                    resolveOrder(buyOrderData, tradeNumber);
                  });
                updateCompanyLastPrice(companyData, lastPrice);
                dbCompanies.update(companyData._id, {
                  $inc: {
                    totalRelease: totalReleaseStocks
                  }
                });
                release();
              });
            }
          }
        });
    }
  }
}

let recordListPriceConter = generateRecordListPriceConter();
export function recordListPrice() {
  if (recordListPriceConter <= 0) {
    recordListPriceConter = generateRecordListPriceConter();
    dbCompanies
      .find(
        {},
        {
          disableOplog: true
        }
      )
      .forEach((companyData) => {
        if (companyData.lastPrice !== companyData.listPrice) {
          const companyName = companyData.companyName;
          //先鎖定資源，再重新讀取一次資料進行運算
          resourceManager.request('recordListPrice', ['companyOrder' + companyName], (release) => {
            const companyData = dbCompanies.findOne(companyData._id);
            dbCompanies.update(companyData._id, {
              $set: {
                listPrice: companyData.lastPrice,
                totalValue: companyData.totalValue * companyData.totalRelease
              }
            });
            release();
          });
        }
      });
  }
}

function generateRecordListPriceConter() {
  const min = config.recordListPriceMinCounter;
  const max = (config.recordListPriceMaxCounter - min);

  return min + Math.random() * max;
}

export function electManager() {
  dbCompanies
    .find(
      {
        $or: [
          {
            'candidateList.1': {
              $exists: true
            }
          },
          {
            manager: '!none'
          }
        ]
      },
      {
        disableOplog: true
      })
    .forEach((companyData) => {
      //沒有經理人也沒有競選人的情況，不予處理
      if (companyData.candidateList.length === 0) {
        return true;
      }
      const companyName = companyData.companyName;
      resourceManager.request('electManager', ['companyElect' + companyName], (release) => {
        const configData = dbConfig.findOne();
        const message = (
          convertDateToText(configData.currentSeasonStartDate) +
          '～' +
          convertDateToText(configData.currentSeasonEndDate)
        );
        //沒有經理人且只有一位競選人的情況下，直接當選
        if (companyData.candidateList.length === 1) {
          dbLog.insert({
            logType: '就任經理',
            username: companyData.candidateList,
            companyName: companyName,
            message: message,
            createdAt: new Date()
          });
          dbCompanies.update(
            {
              _id: companyData._id
            },
            {
              $set: {
                manager: companyData.candidateList[0],
                candidateList: companyData.candidateList,
                voteList: [ [] ]
              }
            }
          );

          return true;
        }

        const voteList = companyData.voteList;
        const candidateList = _.map(companyData.candidateList, (candidate, index) => {
          const voteDirectorList =  voteList[index];
          let stocks = _.reduce(voteDirectorList, (stocks, username) => {
            const directorData = dbDirectors.findOne({companyName, username});

            return stocks + (directorData ? directorData.stocks : 0);
          }, 0);

          return {
            username: candidate,
            stocks: stocks
          };
        });
        const sortedCandidateList = _.sortBy(candidateList, 'stocks');
        const winner = _.last(sortedCandidateList);
        dbLog.insert({
          logType: '就任經理',
          username: [winner.username, companyData.manager],
          companyName: companyName,
          message: message,
          amount: winner.stocks,
          createdAt: new Date()
        });
        dbCompanies.update(
          {
            _id: companyData._id
          },
          {
            $set: {
              manager: winner.username,
              candidateList: [winner.username],
              voteList: [ [] ]
            }
          }
        );
        release();
      });
    });
}
export default electManager;

function convertDateToText(date) {
  return (
    date.getFullYear() + '/' +
    padZero(date.getMonth() + 1) + '/' +
    padZero(date.getDate()) + ' ' +
    padZero(date.getHours()) + ':' +
    padZero(date.getMinutes())
  );
}
function padZero(n) {
  if (n < 10) {
    return '0' + n;
  }
  else {
    return n;
  }
}

