import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { getCurrentArena } from '/db/dbArena';
import { dbArenaFighters, getAttributeNumber, getTotalInvestedAmount } from '/db/dbArenaFighters';
import { inheritedShowLoadingOnSubscribing } from '/client/layout/loading';
import { alertDialog } from '/client/layout/alertDialog';
import { currencyFormat } from '/client/utils/helpers';
import { paramCompany, paramCompanyId } from './helpers';

inheritedShowLoadingOnSubscribing(Template.companyArenaInfo);
Template.companyArenaInfo.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const companyId = paramCompanyId();
    if (companyId) {
      this.subscribe('companyArenaInfo', companyId);
    }
  });
});

Template.companyArenaInfo.helpers({
  pathForCurrentArena() {
    const { _id: arenaId } = getCurrentArena();

    return FlowRouter.path('arenaInfo', { arenaId });
  },
  currentArena() {
    const arenaData = getCurrentArena();

    if (arenaData) {
      arenaData.companyData = paramCompany();
      arenaData.joinData = dbArenaFighters.findOne({
        arenaId: arenaData._id,
        companyId: paramCompanyId()
      });

      return arenaData;
    }
    else {
      return false;
    }
  },
  getAttributeNumber(attribute, number) {
    return getAttributeNumber(attribute, number);
  },
  inCanJoinTime() {
    return Date.now() < this.joinEndDate.getTime();
  },
  arenaMinInvestedAmount() {
    return Meteor.settings.public.arenaMinInvestedAmount;
  },
  notEnoughInvestedAmount() {
    return getTotalInvestedAmount(this) < Meteor.settings.public.arenaMinInvestedAmount;
  }
});

Template.companyArenaInfo.events({
  'click [data-action="joinArena"]'() {
    const { _id, companyName } = paramCompany();
    const checkCompanyName = companyName.replace(/\s/g, '');
    const message = `
      你確定要讓「${companyName}」報名這一屆的最萌亂鬥大賽嗎？<br/>
      報名後將無法取消，請輸入「${checkCompanyName}」以表示確定。
    `;

    alertDialog.prompt({
      message,
      callback: (confirmMessage) => {
        if (confirmMessage === checkCompanyName) {
          Meteor.customCall('joinArena', _id);
        }
      }
    });
  },
  'click [data-invest]'(event, templateInstance) {
    event.preventDefault();
    const { _id, companyName } = paramCompany();
    const investTarget = templateInstance.$(event.currentTarget).attr('data-invest');
    const user = Meteor.user();
    if (! user) {
      alertDialog.alert('您尚未登入！');

      return false;
    }
    const minimumUnitPrice = 1;
    const maximumUnitPrice = user.profile.money;
    if (maximumUnitPrice < minimumUnitPrice) {
      alertDialog.alert('您的金錢不足以投資！');

      return false;
    }
    const message = (
      `請輸入要您要投資在「${companyName}」` +
      `的屬性「${investTarget.toUpperCase()}」的金錢：` +
      `(${currencyFormat(minimumUnitPrice)}~${currencyFormat(maximumUnitPrice)})`
    );

    alertDialog.prompt({
      message,
      inputType: 'number',
      customSetting: `min="${minimumUnitPrice}" max="${maximumUnitPrice}"`,
      callback: (investMoney) => {
        const intInvestMoney = parseInt(investMoney, 10);
        if (! intInvestMoney) {
          return false;
        }
        if (intInvestMoney < minimumUnitPrice || intInvestMoney > maximumUnitPrice) {
          alertDialog.alert('不正確的金額設定！');

          return false;
        }
        Meteor.customCall('investArenaFigher', _id, investTarget, intInvestMoney);
      }
    });
  }
});
