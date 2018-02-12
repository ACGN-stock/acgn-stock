import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbCompanies } from '/db/dbCompanies';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';

inheritedShowLoadingOnSubscribing(Template.editCompany);
Template.editCompany.onCreated(function() {
  this.selectedView = new ReactiveVar();

  this.getCompany = () => {
    if (! this.subscriptionsReady()) {
      return;
    }
    const companyId = FlowRouter.getParam('companyId');

    return dbCompanies.findOne(companyId);
  };

  this.autorunWithIdleSupport(() => {
    const companyId = FlowRouter.getParam('companyId');
    if (companyId) {
      this.subscribe('companyDataForEdit', companyId);
    }
  });
});

Template.editCompany.helpers({
  company() {
    return Template.instance().getCompany();
  },
  switchContentArgs() {
    return {
      templatePrefix: 'editCompanySwitchContent',
      views: [
        { name: 'EditDetail', displayName: '公司資訊', default: true },
        { name: 'ManageProducts', displayName: '產品管理' },
        { name: 'ProfitDistribution', displayName: '營利分配' }
      ],
      data: {
        company: Template.instance().getCompany()
      }
    };
  }
});
