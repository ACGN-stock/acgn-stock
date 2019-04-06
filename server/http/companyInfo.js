import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import url from 'url';
import querystring from 'querystring';

import { getCurrentRound } from '/db/dbRound';
import { dbCompanyArchive } from '/db/dbCompanyArchive';
import { dbFoundations } from '/db/dbFoundations';
import { debug } from '/server/imports/utils/debug';

// 以Ajax方式發布公司名稱
WebApp.connectHandlers.use('/companyInfo', (req, res) => {
  debug.log('connectHandlers companyInfo');

  const { query } = url.parse(req.url);
  const { id: companyId } = querystring.parse(query);

  const companyData = dbCompanyArchive.findOne(companyId, {
    fields: {
      companyName: 1,
      status: 1
    }
  });

  if (! companyData) {
    res.statusCode = 404;
    res.end();

    return;
  }

  if (companyData.status === 'market') {
    const currentRound = getCurrentRound();

    if (currentRound) {
      const cacheTime = currentRound.endDate.getTime() - Date.now();
      if (cacheTime > 0) {
        const cacheTimeSeconds = Math.min(Math.floor(cacheTime / 1000), 604800);
        res.setHeader('Cache-Control', 'public, max-age=' + cacheTimeSeconds);
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
      const cacheTime = foundationData.createdAt.getTime() + Meteor.settings.public.foundExpireTime - Date.now();
      if (cacheTime > 0) {
        const cacheTimeSeconds = Math.floor(cacheTime / 1000);
        res.setHeader('Cache-Control', 'public, max-age=' + cacheTimeSeconds);
      }
    }
  }

  res.end(JSON.stringify(companyData));
});
