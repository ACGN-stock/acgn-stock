import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { createMetaProperty } from '/server/startup/metaTag/createMeta';
import { removeMarkdown } from '/server/startup/metaTag/removeMarkdown';

export function getCompanyMetaTag(companyId) {
  const companyData = companyId ? getCompanyData(companyId) : null;
  if (companyData) {
    return createCompanyMetaTag(companyData);
  }
  else {
    return null;
  }
}

function createCompanyMetaTag(companyData) {
  let metaTag = '';
  metaTag += createMetaProperty('og:site_name', Meteor.settings.public.websiteName);

  const { companyName, pictureSmall } = companyData;
  metaTag += createMetaProperty('og:title', companyName);
  metaTag += createMetaProperty('og:image', pictureSmall);
  metaTag += createMetaProperty('og:image:url', pictureSmall);
  metaTag += createMetaProperty('og:description', createCompanyDescription(companyData));

  return metaTag;
}

function createCompanyDescription({ listPrice, capital, totalValue, description }) {
  return `｜ 價格: ${listPrice.toLocaleString()} ｜ 市值: ${capital.toLocaleString()} ｜ 資本額: ${totalValue.toLocaleString()} ｜

    ${removeMarkdown(description)}
  `;
}

function getCompanyData(companyId) {
  return dbCompanies.findOne({ _id: companyId },
    {
      fileds: {
        companyName: 1,
        pictureSmall: 1,
        description: 1,
        listPrice: 1,
        capital: 1,
        totalValue: 1
      }
    });
}
