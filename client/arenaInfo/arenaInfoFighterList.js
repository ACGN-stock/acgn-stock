import { Meteor } from 'meteor/meteor';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';

import { dbArenaFighters, getAttributeNumber } from '/db/dbArenaFighters';
import { wrapScopeKey } from '/common/imports/utils/wrapScopeKey';
import { inheritedShowLoadingOnSubscribing } from '/client/layout/loading';
import { isArenaEnded, paramArenaId } from './helpers';

inheritedShowLoadingOnSubscribing(Template.arenaInfoFighterList);

Template.arenaInfoFighterList.onCreated(function() {
  this.sortBy = new ReactiveVar('agi');
  this.sortDir = new ReactiveVar(-1);
  this.offset = new ReactiveVar(0);

  this.autorunWithIdleSupport(() => {
    const arenaId = paramArenaId();

    if (! arenaId) {
      return;
    }

    Meteor.subscribe('arenaFighterList', {
      arenaId,
      offset: this.offset.get(),
      sortBy: this.sortBy.get(),
      sortDir: this.sortDir.get()
    });
  });

  this.autorunWithIdleSupport(() => {
    // 更換大賽資訊時，自動依據大賽是否已過期來重設選手排列依據
    const arenaEnded = isArenaEnded();
    this.sortBy.set(arenaEnded ? 'rank' : 'agi');
    this.sortDir.set(arenaEnded ? 1 : -1);
    this.offset.set(0);
  });
});

Template.arenaInfoFighterList.helpers({
  paginationData() {
    return {
      counterName: 'arenaFighterList',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.arenaFighterList,
      offset: Template.instance().offset
    };
  },
  getSortIcon(fieldName) {
    const templateInstance = Template.instance();
    const sortBy = templateInstance.sortBy.get();
    const sortDir = templateInstance.sortDir.get();

    if (fieldName !== sortBy) {
      return '';
    }
    else if (sortDir === -1) {
      return `<i class="fa fa-sort-amount-desc" aria-hidden="true"></i>`;
    }
    else {
      return `<i class="fa fa-sort-amount-asc" aria-hidden="true"></i>`;
    }
  },
  fighterList() {
    const arenaId = paramArenaId();

    if (! arenaId) {
      return;
    }

    const templateInstance = Template.instance();
    const sortBy = templateInstance.sortBy.get();
    const sortDir = templateInstance.sortDir.get();

    const fighterList = dbArenaFighters.find({ arenaId, [wrapScopeKey('list')]: 1 }, { sort: { [sortBy]: sortDir } }).fetch();

    return fighterList.sort((fighter1, fighter2) => {
      switch (sortBy) {
        case 'agi': {
          const agi1 = fighter1.agi;
          const agi2 = fighter2.agi;
          // agi相等時比較createdAt的逆序
          if (agi1 === agi2) {
            return (fighter1.createdAt.getTime() - fighter2.createdAt.getTime()) * sortDir * -1;
          }
          else {
            return (agi1 - agi2) * sortDir;
          }
        }
        default: {
          return (fighter1[sortBy] - fighter2[sortBy]) * sortDir;
        }
      }
    });
  },
  getAttributeNumber(fighter, attributeName) {
    return getAttributeNumber(attributeName, fighter[attributeName]);
  },
  totalInvestedAmountClass(fighter) {
    return (fighter.totalInvestedAmount >= Meteor.settings.public.arenaMinInvestedAmount) ? 'text-success' : 'text-danger';
  }
});

Template.arenaInfoFighterList.events({
  'click [data-sort]'(event, templateInstance) {
    const sortBy = templateInstance.$(event.currentTarget).attr('data-sort');

    if (templateInstance.sortBy.get() === sortBy) {
      templateInstance.sortDir.set(templateInstance.sortDir.get() * -1);
    }
    else {
      templateInstance.sortBy.set(sortBy);
      templateInstance.sortDir.set(-1);
    }
  }
});
