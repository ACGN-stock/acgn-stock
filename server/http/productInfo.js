import { WebApp } from 'meteor/webapp';
import url from 'url';
import querystring from 'querystring';

import { dbProducts } from '/db/dbProducts';
import { debug } from '/server/imports/utils/debug';

// 以Ajax方式發布產品名稱、連結
WebApp.connectHandlers.use(function(req, res, next) {
  debug.log('connectHandlers productInfo');
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/productInfo') {
    const query = querystring.parse(parsedUrl.query);
    const productId = query.id;
    const productData = dbProducts.findOne(productId, {
      fields: {
        productName: 1,
        url: 1,
        type: 1
      }
    });
    if (productData) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.end(JSON.stringify(productData));
    }
    else {
      res.end('');
    }
  }
  else {
    next();
  }
});
