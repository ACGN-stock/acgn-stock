import { WebApp } from 'meteor/webapp';
import url from 'url';
import querystring from 'querystring';

import { dbUserArchive } from '/db/dbUserArchive';
import { debug } from '/server/imports/utils/debug';

// 以Ajax方式發布使用者資訊
WebApp.connectHandlers.use('/userInfo', (req, res) => {
  debug.log('connectHandlers userName');
  const { query } = url.parse(req.url);
  const { id: userId } = querystring.parse(query);

  const userData = dbUserArchive.findOne(userId, {
    fields: {
      name: 1,
      status: 1,
      validateType: 1
    }
  });

  if (! userData) {
    res.statusCode = 404;
    res.end();

    return;
  }

  if (userData.status === 'registered') {
    res.setHeader('Cache-Control', 'public, max-age=604800');
  }

  res.end(JSON.stringify(userData));
});
