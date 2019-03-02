import { WebApp } from 'meteor/webapp';
import { Meteor } from 'meteor/meteor';

WebApp.connectHandlers.use('/sitemap/sitemap-index.xml', (req, res) => {
  let xmlData = `<?xml version="1.0" encoding="UTF-8"?>`;
  xmlData += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  xmlData += createSitemapTag('/sitemap/sitemap-main.xml');
  xmlData += createSitemapTag('/sitemap/sitemap-companies.xml');
  xmlData += `</sitemapindex>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end(xmlData);
});

function createSitemapTag(path) {
  return `<sitemap><loc>https://${Meteor.settings.public.websiteInfo.domainName}${path}</loc></sitemap>`;
}
