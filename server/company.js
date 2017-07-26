'use strict';
import { _ } from 'meteor/underscore';
import { lockManager } from '../methods/lockManager';
import { dbCompanies } from '../db/dbCompanies';
import { dbDirectors } from '../db/dbDirectors';
import { dbLog } from '../db/dbLog';
import { dbSeasonRecord } from '../db/dbSeasonRecord';

export function electManager() {
  dbCompanies.find({
    $or: [
      {
        candidateList: {
          $not: {
            $size: 1
          }
        }
      },
      {
        manager: ''
      }
    ]
  }, {
    disableOplog: true
  }).forEach((companyData) => {
    //沒有經理人也沒有競選人的情況，不予處理
    if (companyData.candidateList.length === 0) {
      return true;
    }
    const companyName = companyData.name;
    const unlock = lockManager.lock([companyName], true);
    const seasonRecord = dbSeasonRecord.findOne();
    const message = (
      convertDateToText(seasonRecord.startDate) +
      '～' +
      convertDateToText(seasonRecord.endDate)
    );
    //沒有經理人且只有一位競選人的情況下，直接當選
    if (companyData.candidateList.length === 1) {
      dbLog.insert({
        logType: '就任經理',
        username: companyData.candidateList,
        companyName: companyName,
        message: message
      });
      dbCompanies.update({
        _id: companyData._id
      }, {
        $set: {
          manager: companyData.candidateList[0],
          candidateList: [winner.username],
          voteList: [ [] ]
        }
      });

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
      username: [winner.username],
      companyName: companyName,
      message: message,
      amount: winner.stocks
    });
    dbCompanies.update({
      _id: companyData._id
    }, {
      $set: {
        manager: winner.username,
        candidateList: [winner.username],
        voteList: [ [] ]
      }
    });
    unlock();
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
