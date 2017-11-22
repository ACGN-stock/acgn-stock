import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import url from 'url';
import querystring from 'querystring';

import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbFoundations } from '/db/dbFoundations';
import { dbRound } from '/db/dbRound';
import { debug } from '/server/imports/debug';

//以Ajax方式發布公司名稱
WebApp.connectHandlers.use(function(req, res, next) {
  debug.log('connectHandlers companyInfo');
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/companyInfo') {
    const query = querystring.parse(parsedUrl.query);
    const companyId = query.id;
    const companyData = dbCompanyArchive.findOne(companyId, {
      fields: {
        name: 1,
        status: 1
      }
    });
    if (companyData) {
      if (companyData.status === 'market') {
        const lastRoundData = dbRound.findOne({}, {
          sort: {
            beginDate: -1
          }
        });
        if (lastRoundData) {
          const cacheMicroTime = lastRoundData.endDate.getTime() - Date.now();
          if (cacheMicroTime > 0) {
            const cacheTime = Math.min(Math.floor(cacheMicroTime / 1000), 604800);
            res.setHeader('Cache-Control', 'public, max-age=' + cacheTime);
          }
        }
      }
      else if (companyData.status === 'foundation') {
        const foundationData = dbFoundations.findOne(companyId, {
          fields: {
            createdAt: 1
          }
        });
        if (foundationData) {
          const cacheMicroTime = foundationData.createdAt.getTime() + Meteor.settings.public.foundExpireTime - Date.now();
          if (cacheMicroTime > 0) {
            const cacheTime = Math.floor(cacheMicroTime / 1000);
            res.setHeader('Cache-Control', 'public, max-age=' + cacheTime);
          }
        }
      }
      res.end(JSON.stringify(companyData));
    }
    else {
      res.end('');
    }
  }
  else {
    next();
  }
});
