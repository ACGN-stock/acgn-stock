'use strict';
import url from 'url';
import querystring from 'querystring';
import { WebApp } from 'meteor/webapp';
import { HTTP } from 'meteor/http';
import { dbCompanyArchive } from '../../db/dbCompanyArchive';
import { dbProducts } from '../../db/dbProducts';
import { dbUserArchive } from '../../db/dbUserArchive';
import { debug } from '../debug';

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
      res.setHeader('Cache-Control', 'public, max-age=604800');
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

//以Ajax方式發布產品名稱、連結
WebApp.connectHandlers.use(function(req, res, next) {
  debug.log('connectHandlers productInfo');
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/productInfo') {
    const query = querystring.parse(parsedUrl.query);
    const productId = query.id;
    const productData = dbProducts.findOne(productId, {
      fields: {
        productName: 1,
        url: 1
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

//以Ajax方式發布使用者名稱
WebApp.connectHandlers.use(function(req, res, next) {
  debug.log('connectHandlers userName');
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/userInfo') {
    const query = querystring.parse(parsedUrl.query);
    const userId = query.id;
    const userData = dbUserArchive.findOne(userId, {
      fields: {
        name: 1,
        status: 1,
        validateType: 1,
        accessToken: 1
      }
    });
    if (userData) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      if (userData.validateType === 'Google' && userData.accessToken) {
        try {
          /* eslint-disable camelcase */
          const response = HTTP.get('https://www.googleapis.com/oauth2/v1/userinfo', {
            params: {
              access_token: userData.accessToken
            }
          });
          /* eslint-enable camelcase */
          userData.name = response.data.name;
        }
        catch (e) {
          userData.name = userData.name;
        }
      }
      else {
        res.end(JSON.stringify(userData));
      }
    }
    else {
      res.end('');
    }
  }
  else {
    next();
  }
});
