import { dbCompanies, gradeNameList, gradeProportionMap } from '/db/dbCompanies';
import { debug } from '/server/imports/utils/debug';

// 對全市場進行公司評級統計
export function updateCompanyGrades() {
  debug.log('updateCompanyGrades');

  const companyCount = dbCompanies.find({ isSeal: false }).count();

  const capitalBoundaries = gradeNameList.map((grade) => {
    const splitPosition = Math.round(companyCount * gradeProportionMap[grade]);

    const companyData = dbCompanies.findOne({
      isSeal: false
    }, {
      sort: { capital: -1 },
      skip: splitPosition
    });

    return companyData ? companyData.capital : -Infinity;
  });

  gradeNameList.forEach((grade, i) => {
    const capitalUpperBound = capitalBoundaries[i - 1] || Infinity;
    const capitalLowerBound = capitalBoundaries[i];

    dbCompanies.update({
      isSeal: false,
      capital: {
        $lte: capitalUpperBound,
        $gt: capitalLowerBound
      }
    }, {
      $set: { grade }
    }, {
      multi: true
    });
  });
}
