import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbVips, getVipThresholds } from '/db/dbVips';
import { wrapScopeKey } from '/common/imports/utils/wrapScopeKey';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';
import { paramCompany, paramCompanyId } from './helpers';

const displayVipLevelOptions = [
  { value: 'all', text: '全部' },
  ...[5, 4, 3, 2, 1, 0].map((i) => {
    return { value: `${i}`, text: `Level ${i}` };
  })
];
const defaultDisplayVipLevel = displayVipLevelOptions[0].value;

inheritedShowLoadingOnSubscribing(Template.companyVipListPanel);

Template.companyVipListPanel.onCreated(function() {
  this.vipListOffset = new ReactiveVar(0);
  this.selectedDisplayVipLevel = new ReactiveVar(defaultDisplayVipLevel);

  this.autorunWithIdleSupport(() => {
    const displayVipLevel = this.selectedDisplayVipLevel.get();
    const level = displayVipLevel === 'all' ? undefined : Number.parseInt(displayVipLevel, 10);

    this.subscribe('companyVips', {
      companyId: paramCompanyId(),
      level,
      offset: this.vipListOffset.get()
    });
  });

  this.autorunWithIdleSupport(() => {
    if (Meteor.userId()) {
      this.subscribe('currentUserCompanyVip', paramCompanyId());
    }
  });
});

Template.companyVipListPanel.helpers({
  vipThresholds() {
    return getVipThresholds(paramCompany())
      .map((score, i) => {
        return { level: i, score };
      })
      .slice(1)
      .reverse();
  },
  currentUserVipData() {
    const userId = Meteor.userId();
    if (! userId) {
      return;
    }

    return dbVips.findOne({ userId });
  },
  companyVips() {
    return dbVips.find({ [wrapScopeKey('companyVips')]: 1 }, { sort: { score: -1, createdAt: 1 } });
  },
  vipScoreClass(vip) {
    const vipThresholds = getVipThresholds(paramCompany());
    const nextLevelThreshold = vipThresholds[vip.level + 1] || Infinity;
    const currentLevelThreshold = vipThresholds[vip.level];

    if (vip.score >= nextLevelThreshold) {
      return 'px-1 bg-success text-white';
    }

    if (vip.score < currentLevelThreshold) {
      return 'px-1 bg-danger text-white';
    }

    return 'text-info';
  },
  vipLevelClass(vip) {
    return `vip-level-${vip.level}`;
  },
  displayVipLevelOptions() {
    return displayVipLevelOptions;
  },
  displayVipLevelOptionSelectedAttr(value) {
    return Template.instance().selectedDisplayVipLevel.get() === value ? 'selected' : '';
  },
  paginationData() {
    return {
      useVariableForTotalCount: 'totalCountOfCompanyVips',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.companyVips,
      offset: Template.instance().vipListOffset
    };
  }
});

Template.companyVipListPanel.events({
  'change select[name="displayVipLevel"]': _.debounce(function(event, templateInstance) {
    event.preventDefault();
    templateInstance.selectedDisplayVipLevel.set($(event.currentTarget).val());
    templateInstance.vipListOffset.set(0);
  }, 250)
});
