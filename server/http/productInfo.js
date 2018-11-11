import { WebApp } from 'meteor/webapp';
import url from 'url';
import querystring from 'querystring';

import { dbProducts } from '/db/dbProducts';
import { debug } from '/server/imports/utils/debug';

// 以Ajax方式發布產品名稱、連結
WebApp.connectHandlers.use('/productInfo', (req, res) => {
  debug.log('connectHandlers productInfo');
  const { query } = url.parse(req.url);
  const { id: productId } = querystring.parse(query);

  const productData = dbProducts.findOne(productId, {
    fields: {
      productName: 1,
      url: 1,
      type: 1,
      companyId: 1
    }
  });

  if (! productData) {
    res.statusCode = 404;
    res.end();

    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=604800');
  res.end(JSON.stringify(productData));
});
