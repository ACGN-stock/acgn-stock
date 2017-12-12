import { dbCompanies, gradeList } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';

// 對全市場進行公司評級統計
export function updateCompanyGrades() {
  debug.log('updateCompanyGrades');

  const companyCount = dbCompanies.find({ isSeal: false }).count();

  const splitPositions = gradeList.map((_, i) => {
    return Math.round(companyCount * (i + 1) / gradeList.length);
  });

  const capitalBoundaries = splitPositions.map((n) => {
    const companyData = dbCompanies.findOne({
      isSeal: false
    }, {
      sort: { capital: -1 },
      skip: n
    });

    return companyData ? companyData.capital : 0;
  });

  gradeList.forEach((grade, i) => {
    const capitalUpperBound = capitalBoundaries[i - 1] || Infinity;
    const capitalLowerBound = capitalBoundaries[i];

    dbCompanies.update({
      isSeal: false,
      capital: {
        $lt: capitalUpperBound,
        $gte: capitalLowerBound
      }
    }, {
      $set: { grade }
    }, {
      multi: true
    });
  });
}
