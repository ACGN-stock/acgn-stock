import { WebApp } from 'meteor/webapp';
import { Meteor } from 'meteor/meteor';

WebApp.connectHandlers.use('/sitemap/sitemap-main.xml', (req, res) => {
  let xmlData = `<?xml version="1.0" encoding="UTF-8"?>`;
  xmlData += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
  xmlData += createUrlTag('/');
  xmlData += createUrlTag('/company/1');
  xmlData += createUrlTag('/foundation/1');
  xmlData += createUrlTag('/announcement');
  xmlData += createUrlTag('/ruleDiscuss');
  xmlData += createUrlTag('/violation');
  xmlData += `</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end(xmlData);
});

function createUrlTag(path) {
  return `<url><loc>https://${Meteor.settings.public.websiteInfo.domainName}${path}</loc><priority>1.0</priority></url>`;
}
