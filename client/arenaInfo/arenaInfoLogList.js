import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { _ } from 'meteor/underscore';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbArenaFighters } from '/db/dbArenaFighters';
import { dbArenaLog } from '/db/dbArenaLog';
import { inheritedShowLoadingOnSubscribing } from '/client/layout/loading';
import { wrapScopeKey } from '/common/imports/utils/wrapScopeKey';
import { paramArenaId, isArenaEnded } from './helpers';

inheritedShowLoadingOnSubscribing(Template.arenaInfoLogList);

Template.arenaInfoLogList.onCreated(function() {
  this.offset = new ReactiveVar(0);
  this.filterCompanyId = new ReactiveVar('');
  this.filterSuggestions = new ReactiveVar([]);
  this.filterKeyword = new ReactiveVar('');

  this.autorunWithIdleSupport(() => {
    const arenaId = paramArenaId();

    if (! arenaId) {
      return;
    }

    this.subscribe('arenaLog', {
      arenaId,
      companyId: this.filterCompanyId.get(),
      offset: this.offset.get()
    });
  });
});

Template.arenaInfoLogList.onRendered(function() {
  this.autorun(() => {
    this.$('[name="companyId"]').val(this.filterKeyword.get() || '');
  });
});

Template.arenaInfoLogList.helpers({
  filterSuggestions() {
    return Template.instance().filterSuggestions.get();
  },
  logList() {
    const arenaId = paramArenaId();

    return dbArenaLog
      .find(arenaId, {}, {
        sort: {
          sequence: 1
        }
      })
      .map((log) => {
        log.attackerId = log.companyId[0];
        log.defenderId = log.companyId[1];

        return log;
      });
  },
  displaySp(log) {
    if (log.attackManner > 0) {
      return `(SP:${log.attackerSp})`;
    }
    else {
      const arenaId = log.arenaId;
      const companyId = log.attackerId;
      const attacker = dbArenaFighters.findOne({ arenaId, companyId });

      return `(SP:${log.attackerSp}<span class="text-danger">-${attacker.spCost}</span>)`;
    }
  },
  displayAttackManaer(log) {
    let result = '';
    const arenaId = log.arenaId;
    const companyId = log.attackerId;
    const attacker = dbArenaFighters.findOne({ arenaId, companyId, [wrapScopeKey('log')]: 1 });
    if (attacker) {
      if (log.attackManner > 0) {
        result += '普通攻擊';
        const mannerName = attacker.normalManner[log.attackManner - 1];
        if (mannerName) {
          result += '「' + mannerName + '」';
        }
      }
      else {
        result += '特殊攻擊';
        const mannerName = attacker.specialManner[(log.attackManner * -1) - 1];
        if (mannerName) {
          result += '「' + mannerName + '」';
        }
      }

      return result;
    }
    else {
      return '???';
    }
  },
  paginationData() {
    const templateInstance = Template.instance();

    return {
      counterName: 'arenaLog',
      dataNumberPerPage: Meteor.settings.public.dataNumberPerPage.arenaLog,
      offset: templateInstance.offset
    };
  }
});

const fetchFilterSuggestionList = _.debounce(function(event, templateInstance) {
  const arenaId = paramArenaId();
  const keyword = $(event.currentTarget).val();
  const oldKeyword = templateInstance.filterKeyword.get();

  if (oldKeyword === keyword) {
    return;
  }

  templateInstance.filterKeyword.set(keyword);

  if (! isArenaEnded() || ! keyword) {
    templateInstance.filterSuggestions.set([]);

    return;
  }

  Meteor.customCall('getArenaLogFilterSuggestions', { arenaId, keyword }, (error, result) => {
    templateInstance.filterSuggestions.set(result);
  });
}, 1000);

function selectedCompanyIdFliter(event, templateInstance) {
  event.preventDefault();
  const companyId = templateInstance.$(event.currentTarget).attr('data-company-id');
  const { companyName } = _.findWhere(templateInstance.filterSuggestions.get(), { companyId });

  templateInstance.filterCompanyId.set(companyId);
  templateInstance.filterKeyword.set(companyName);
  templateInstance.filterSuggestions.set([]);
  templateInstance.offset.set(0);
}

Template.arenaInfoLogList.events({
  'keyup [name="companyId"]': fetchFilterSuggestionList,
  'change [name="companyId"]': fetchFilterSuggestionList,
  'click [data-action="setLogFilter"]': selectedCompanyIdFliter,
  'touchstart [data-action="setLogFilter"]': selectedCompanyIdFliter,
  'submit'(event, templateInstance) {
    event.preventDefault();
    const filterSuggestions = templateInstance.filterSuggestions.get();

    if (filterSuggestions.length < 1) {
      templateInstance.filterCompanyId.set('');
      templateInstance.filterKeyword.set('');

      return;
    }

    const { companyId, companyName } = filterSuggestions[0];
    templateInstance.filterCompanyId.set(companyId);
    templateInstance.filterKeyword.set(companyName);
    templateInstance.filterSuggestions.set([]);
    templateInstance.offset.set(0);
  }
});
