import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbDirectors } from '/db/dbDirectors';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { paramUserId } from './helpers';

inheritedShowLoadingOnSubscribing(Template.accountInfoOwnStockList);

Template.accountInfoOwnStockList.onCreated(function() {
  this.ownStocksOffset = new ReactiveVar(0);

  this.autorun(() => {
    const userId = paramUserId();

    if (userId) {
      const offset = this.ownStocksOffset.get();
      this.subscribe('accountOwnStocks', userId, offset);
    }
  });
});
Template.accountInfoOwnStockList.helpers({
  directorList() {
    const userId = paramUserId();

    return dbDirectors.find({ userId }, {
      limit: 10
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountOwnStocks',
      dataNumberPerPage: 10,
      offset: Template.instance().ownStocksOffset
    };
  }
});
