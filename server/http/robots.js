import { WebApp } from 'meteor/webapp';
import { Meteor } from 'meteor/meteor';

WebApp.connectHandlers.use('/robots.txt', (req, res) => {
  let robotsTxt = `User-agent: * \n`;
  robotsTxt += `Crawl-deslay: 4 \n`;
  robotsTxt += `Disallow: /companyInfo* \n`;
  robotsTxt += `Disallow: /productInfo* \n`;
  robotsTxt += `Disallow: /userInfo* \n`;

  robotsTxt += `\n`;
  robotsTxt += `sitemap: https://${Meteor.settings.public.websiteInfo.domainName}/sitemap/sitemap-index.xml \n`;

  res.setHeader('Cache-Control', 'public, max-age=604800');
  res.end(robotsTxt);
});
