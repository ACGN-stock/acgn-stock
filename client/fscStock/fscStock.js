import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { dbDirectors } from '/db/dbDirectors';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { shouldStopSubscribe } from '../utils/idle';

const showListPerPage = 20;
export const ownStocksOffset = new ReactiveVar(0);
inheritedShowLoadingOnSubscribing(Template.fscStock);
Template.fscStock.onCreated(function() {
  ownStocksOffset.set(0);
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    const userId = '!FSC';
    this.subscribe('accountOwnStocks', userId, ownStocksOffset.get(), { limit: showListPerPage, includeSeal: false });
  });
});
Template.fscStock.helpers({
  stockList() {
    const userId = '!FSC';

    return dbDirectors.find({ userId }, {
      limit: showListPerPage
    });
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfAccountOwnStocks',
      dataNumberPerPage: showListPerPage,
      offset: ownStocksOffset
    };
  }
});
