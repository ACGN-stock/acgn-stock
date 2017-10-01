'use strict';
import url from 'url';
import querystring from 'querystring';
import { Meteor } from 'meteor/meteor';
import { WebApp } from 'meteor/webapp';
import { HTTP } from 'meteor/http'
import { dbCompanies } from '../../db/dbCompanies';
import { dbFoundations } from '../../db/dbFoundations';
import { dbProducts } from '../../db/dbProducts';
import { debug } from '../debug';

//以Ajax方式發布公司名稱
WebApp.connectHandlers.use(function(req, res, next) {
  debug.log('connectHandlers companyName');
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/companyName') {
    const query = querystring.parse(parsedUrl.query);
    const companyId = query.id;
    const companyData = dbCompanies.findOne(companyId, {
      fields: {
        companyName: 1
      }
    });
    if (companyData) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.end(companyData.companyName);
    }
    else {
      res.end('');
    }
  }
  else {
    next();
  }
});
WebApp.connectHandlers.use(function(req, res, next) {
  debug.log('connectHandlers foundationName');
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/foundationName') {
    const query = querystring.parse(parsedUrl.query);
    const foundationId = query.id;
    const foundationData = dbFoundations.findOne(foundationId, {
      fields: {
        companyName: 1
      }
    });
    if (foundationData) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      res.end(foundationData.companyName);
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
  debug.log('connectHandlers productName');
  const parsedUrl = url.parse(req.url);
  if (parsedUrl.pathname === '/productName') {
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
  if (parsedUrl.pathname === '/userName') {
    const query = querystring.parse(parsedUrl.query);
    const userId = query.id;
    const userData = Meteor.users.findOne(userId, {
      fields: {
        'services.google.accessToken': 1,
        'profile.name': 1
      }
    });
    if (userData) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
      if (userData.services.google) {
        const accessToken = userData.services.google.accessToken;
        try {
          const response = HTTP.get('https://www.googleapis.com/oauth2/v1/userinfo', {
            params: {
              access_token: accessToken
            }
          });
          res.end(response.data.name);
        }
        catch (e) {
          res.end(userData.profile.name);
        }
      }
      else {
        res.end(userData.profile.name);
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
