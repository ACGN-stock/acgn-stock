import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';

import { inheritUtilForm, handleInputChange as inheritedHandleInputChange } from '/client/utils/form';
import { getAttributeNumber } from '/db/dbArenaFighters';
import { alertDialog } from '/client/layout/alertDialog';

inheritUtilForm(Template.arenaStrategyForm);
const rSortedAttackSequence = new ReactiveVar([]);
Template.arenaStrategyForm.onCreated(function() {
  this.validateModel = validateStrategyModel;
  this.handleInputChange = handleStrategyInputChange;
  this.saveModel = saveStrategyModel;
  this.model.set(this.data.joinData);
  this.draggingIndex = null;
  rSortedAttackSequence.set([]);
});
Template.arenaStrategyForm.onRendered(function() {
  this.model.set(this.data.joinData);
});
function validateStrategyModel(model) {
  const error = {};

  if (model.spCost > getAttributeNumber('sp', model.sp)) {
    error.spCost = '特攻消耗數值不可超過角色的SP值！';
  }
  else if (model.spCost < 1) {
    error.spCost = '特攻消耗數值不可低於1！';
  }
  else if (model.spCost > 10) {
    error.spCost = '特攻消耗數值不可高於10！';
  }

  if (_.size(error) > 0) {
    return error;
  }
}
function handleStrategyInputChange(event) {
  switch (event.currentTarget.name) {
    case 'spCost': {
      const model = this.model.get();
      model.spCost = parseInt(event.currentTarget.value, 10);
      this.model.set(model);
      break;
    }
    case 'normalManner': {
      const model = this.model.get();
      model.normalManner = this.$input
        .filter('[name="normalManner"]')
        .map((index, input) => {
          return input.value;
        })
        .toArray();
      this.model.set(model);
      break;
    }
    case 'specialManner': {
      const model = this.model.get();
      model.specialManner = this.$input
        .filter('[name="specialManner"]')
        .map((index, input) => {
          return input.value;
        })
        .toArray();
      this.model.set(model);
      break;
    }
    default: {
      inheritedHandleInputChange.call(this, event);
      break;
    }
  }
}
function saveStrategyModel(model) {
  const submitData = _.pick(model, 'spCost', 'normalManner', 'specialManner');
  submitData.attackSequence = rSortedAttackSequence.get();
  Meteor.customCall('decideArenaStrategy', model.companyId, submitData, (error) => {
    if (! error) {
      alertDialog.alert('決策完成！');
    }
  });
}
Template.arenaStrategyForm.helpers({
  spForecast() {
    const sp = getAttributeNumber('sp', this.joinData.sp);
    const model = Template.instance().model.get();
    const spCost = model.spCost;
    const tenRoundForecast = Math.floor(Math.min((sp + 1) / spCost, spCost));
    const maximumRound = Meteor.settings.public.arenaMaximumRound;
    const maximumForecast = Math.floor(Math.min((sp + Math.floor(maximumRound / 10)) / spCost, spCost / 10 * maximumRound));


    return `目前的SP量為 ${sp}
      ，在 10 回合的戰鬥中估計可以發出 ${tenRoundForecast} 次特殊攻擊，
      在 ${maximumRound} 回合的戰鬥中估計可以發出 ${maximumForecast} 次特殊攻擊。`;
  },
  getManner(type, index) {
    const model = Template.instance().model.get();
    const fieldName = `${type}Manner`;

    return model[fieldName][index];
  },
  hasEnemy() {
    return this.shuffledFighterCompanyIdList.length > 0;
  },
  enemyList() {
    const shuffledFighterCompanyIdList = this.shuffledFighterCompanyIdList;
    const model = Template.instance().model.get();

    return _.map(model.attackSequence, (attackIndex) => {
      return {
        _id: attackIndex,
        companyId: shuffledFighterCompanyIdList[attackIndex]
      };
    });
  },
  notSorted(index) {
    return ! _.contains(rSortedAttackSequence.get(), index);
  },
  sortedEnemyList() {
    const shuffledFighterCompanyIdList = this.shuffledFighterCompanyIdList;

    return _.map(rSortedAttackSequence.get(), (attackIndex) => {
      return {
        _id: attackIndex,
        companyId: shuffledFighterCompanyIdList[attackIndex]
      };
    });
  }
});
Template.arenaStrategyForm.events({
  'click [data-action="sortAll"]'(event, templateInstance) {
    const model = templateInstance.model.get();
    const attackSequence = rSortedAttackSequence.get();
    rSortedAttackSequence.set(_.union(attackSequence, model.attackSequence));
  },
  'click [data-add]'(event, templateInstance) {
    const index = parseFloat(templateInstance.$(event.currentTarget).attr('data-add'));
    const sortedAttackSequence = rSortedAttackSequence.get();
    rSortedAttackSequence.set(_.union(sortedAttackSequence, [index]));
  },
  'click [data-remove]'(event, templateInstance) {
    const index = parseFloat(templateInstance.$(event.currentTarget).attr('data-remove'));
    const sortedAttackSequence = rSortedAttackSequence.get();
    rSortedAttackSequence.set(_.without(sortedAttackSequence, index));
  },
  reset(event, templateInstance) {
    event.preventDefault();
    templateInstance.model.set(templateInstance.data.joinData);
    rSortedAttackSequence.set([]);
  }
});
