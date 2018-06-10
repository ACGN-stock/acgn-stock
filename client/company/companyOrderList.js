import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';

import { dbOrders, orderTypeTranslateMap } from '/db/dbOrders';
import { wrapScopeKey } from '/common/imports/utils/wrapScopeKey';
import { inheritedShowLoadingOnSubscribing } from '/client/layout/loading';
import { paramCompanyId } from './helpers';

inheritedShowLoadingOnSubscribing(Template.companyOrderList);

Template.companyOrderList.onCreated(function() {
  this.offset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const { companyId, type } = Template.currentData();
    const offset = this.offset.get();
    this.subscribe('companyOrders', { companyId, type, offset });
  });

  this.getSortOptions = () => {
    const { type } = Template.currentData();

    return {
      unitPrice: type === 'sell' ? 1 : -1,
      createdAt: 1
    };
  };
});

Template.companyOrderList.helpers({
  orders() {
    const { type } = Template.currentData();
    const sortOptions = Template.instance().getSortOptions();

    return dbOrders.find({
      companyId: paramCompanyId(),
      orderType: orderTypeTranslateMap[type],
      [wrapScopeKey(type)]: 1
    }, { sort: sortOptions });
  },
  paginationData() {
    const { type } = Template.currentData();

    return {
      counterName: `${type}Orders`,
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.companyOrders,
      offset: Template.instance().offset
    };
  }
});
