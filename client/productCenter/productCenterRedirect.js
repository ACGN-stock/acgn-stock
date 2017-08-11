'use strict';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbSeason } from '../../db/dbSeason';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';

inheritedShowLoadingOnSubscribing(Template.productCenterRedirect);
Template.productCenterRedirect.onCreated(function() {
  this.subscribe('currentSeason');
  this.autorun(() => {
    const currentSeasonData = dbSeason.findOne({}, {
      sort: {
        beginDate: -1
      }
    });
    if (currentSeasonData) {
      const path = FlowRouter.path('productCenterBySeason', {
        seasonId: currentSeasonData._id
      });
      FlowRouter.go(path);
    }
  });
});

