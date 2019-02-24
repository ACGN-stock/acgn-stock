import { WebApp } from 'meteor/webapp';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';

WebApp.connectHandlers.use('/sitemap/sitemap-companies.xml', (req, res) => {
  let xmlData = `<?xml version="1.0" encoding="UTF-8"?>`;
  xmlData += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  dbCompanies.find({}, { fields: { _id: 1, grade: 1 } })
    .forEach((companyData) => {
      xmlData += createCompanyUrlTag(companyData);
    });
  xmlData += `</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end(xmlData);
});


function createCompanyUrlTag(companyData) {
  return `<url>${createLocTag(companyData)}${createPriorityTag(companyData)}</url>`;
}

function createLocTag({ _id }) {
  return `<loc>https://${Meteor.settings.public.websiteInfo.domainName}/company/detail/${_id}</loc>`;
}

function createPriorityTag({ grade }) {
  let priority = '';
  switch (grade) {
    case 'S':
      priority = '0.9';
      break;
    case 'A':
      priority = '0.8';
      break;
    case 'B':
      priority = '0.7';
      break;
    case 'C':
      priority = '0.6';
      break;
    default:
      priority = '0.5';
      break;
  }

  return `<priority>${priority}</priority>`;
}
