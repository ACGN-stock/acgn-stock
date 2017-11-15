import { _ } from 'meteor/underscore';
import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';

import { dbCompanies } from '/db/dbCompanies';
import { dbDirectors } from '/db/dbDirectors';
import { dbProducts } from '/db/dbProducts';
import { limitSubscription } from '/server/imports/rateLimit';
import { debug } from '/server/imports/debug';

Meteor.publish('companyDetail', function(companyId) {
  debug.log('publish companyDetail', companyId);
  check(companyId, String);
  const nextSeasonProductData = dbProducts.findOne(
    {
      companyId: companyId,
      overdue: 0
    },
    {
      fields: {
        _id: 1,
        overdue: 1
      }
    }
  );
  if (nextSeasonProductData) {
    this.added('products', nextSeasonProductData._id, {
      companyId: companyId,
      overdue: nextSeasonProductData.overdue
    });
  }

  const observer = dbCompanies
    .find(companyId, {
      fields: {
        pictureSmall: 0
      },
      disableOplog: true
    })
    .observeChanges({
      added: (id, fields) => {
        addSupportStocksListField(id, fields);
        this.added('companies', id, fields);
      },
      changed: (id, fields) => {
        addSupportStocksListField(id, fields);
        this.changed('companies', id, fields);
      }
    });
  this.ready();
  this.onStop(() => {
    observer.stop();
  });
});
//一分鐘最多20次
limitSubscription('companyDetail');

function addSupportStocksListField(companyId, fields = {}) {
  debug.log('addSupportStocksListField', companyId, fields);
  const companyData = dbCompanies.findOne(companyId, {
    fields: {
      voteList: 1
    }
  });
  fields.supportStocksList = _.map(companyData.voteList, (voteDirectorIdList) => {
    return _.reduce(voteDirectorIdList, (supportStocks, voteDirectorId) => {
      const directorData = dbDirectors.findOne(
        {
          companyId: companyId,
          userId: voteDirectorId
        },
        {
          fields: {
            stocks: 1
          }
        }
      );
      const stocks = directorData ? directorData.stocks : 0;

      return supportStocks + stocks;
    }, 0);
  });
}
