import { WebApp } from 'meteor/webapp';
import { Meteor } from 'meteor/meteor';

WebApp.connectHandlers.use('/robots.txt', (req, res) => {
  let robotsTxt = `User-agent: * \n`;
  robotsTxt += `Disallow: /companyInfo* \n`;
  robotsTxt += `Disallow: /productInfo* \n`;
  robotsTxt += `Disallow: /userInfo* \n`;
  robotsTxt += `Disallow: /company/edit/* \n`;
  robotsTxt += `Disallow: /foundation/view/* \n`;
  robotsTxt += `Disallow: /violation?offset=* \n`;
  robotsTxt += `Disallow: /violation/view/* \n`;
  robotsTxt += `Disallow: /violation/report* \n`;
  robotsTxt += `Disallow: /fscLogs* \n`;
  robotsTxt += `Crawl-delay: 4 \n`;

  robotsTxt += `\n`;
  robotsTxt += `sitemap: https://${Meteor.settings.public.websiteInfo.domainName}/sitemap/sitemap-index.xml \n`;

  res.setHeader('Cache-Control', 'public, max-age=604800');
  res.end(robotsTxt);
});
