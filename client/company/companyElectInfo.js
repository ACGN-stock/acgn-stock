import { ReactiveVar } from 'meteor/reactive-var';
import { _ } from 'meteor/underscore';
import { Meteor } from 'meteor/meteor';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';

import { getCurrentSeason } from '/db/dbSeason';
import { alertDialog } from '/client/layout/alertDialog';
import { getCurrentUserOwnedStockAmount, paramCompany, paramCompanyId } from './helpers';

Template.companyElectInfo.onCreated(function() {
  this.selectedCandidateInfo = new ReactiveVar(null);
});

Template.companyElectInfo.helpers({
  company() {
    return paramCompany();
  },
  inElect() {
    const candidateList = this.candidateList;

    return candidateList && candidateList.length > 1;
  },
  canContendManager() {
    const { contendManagerEndTime, electManagerTime } = Meteor.settings.public;
    const { endDate: seasonEndDate } = getCurrentSeason();

    const contendManagerEndTimePassed = seasonEndDate.getTime() - Date.now() < contendManagerEndTime;
    const electManagerTimePassed = seasonEndDate.getTime() - Date.now() < electManagerTime;

    // 在經理參選報名截止後，至經理完成選舉之前，禁止參選
    if (contendManagerEndTimePassed && ! electManagerTimePassed) {
      return false;
    }

    const user = Meteor.user();
    if (user && ! user.profile.revokeQualification) {
      return ! _.contains(this.candidateList, user._id);
    }

    return false;
  },
  getSupportPercentage(candidateIndex) {
    const { supportStocksList, totalRelease } = paramCompany();
    const supportStocks = supportStocksList ? supportStocksList[candidateIndex] : 0;

    return Math.round(supportStocks / totalRelease * 10000) / 100;
  },
  hasSupporters(candidateIndex) {
    return ! _.isEmpty(paramCompany().voteList[candidateIndex]);
  },
  getCurrentUserOwnedStockAmount() {
    return getCurrentUserOwnedStockAmount(paramCompanyId());
  },
  showSupportListDialog() {
    return !! Template.instance().selectedCandidateInfo.get();
  },
  supporterListDialogArgs() {
    const templateInstance = Template.instance();
    const { candidateId, voteList } = templateInstance.selectedCandidateInfo.get();

    return {
      candidateId,
      voteList,
      onDismiss: () => {
        templateInstance.selectedCandidateInfo.set(null);
      }
    };
  }
});

Template.companyElectInfo.events({
  'click [data-action="contendManager"]'(event) {
    event.preventDefault();
    const { _id: companyId, companyName } = paramCompany();
    alertDialog.confirm({
      message: `你確定要參與競爭「${companyName}」的經理人職位嗎？`,
      callback: (result) => {
        if (result) {
          Meteor.customCall('contendManager', companyId);
        }
      }
    });
  },
  'click [data-support-candidate]'(event) {
    event.preventDefault();
    const user = Meteor.user();
    if (! user) {
      return;
    }

    const { _id: companyId, candidateList, voteList } = paramCompany();
    const candidateIndex = parseInt($(event.currentTarget).attr('data-support-candidate'), 10);
    const candidate = candidateList[candidateIndex];
    const supportList = voteList[candidateIndex];

    $.ajax({
      url: '/userInfo',
      data: {
        id: candidate
      },
      dataType: 'json',
      success: (userData) => {
        const userName = userData.name;
        if (_.contains(supportList, user._id)) {
          alertDialog.alert(`你已經正在支持使用者${userName}了，無法再次進行支持！`);
        }
        else {
          alertDialog.confirm({
            message: `你確定要支持候選人「${userName}」嗎？`,
            callback: (result) => {
              if (result) {
                Meteor.customCall('supportCandidate', companyId, candidate);
              }
            }
          });
        }
      }
    });
  },
  'click [data-show-supporter]'(event, templateInstance) {
    event.preventDefault();
    const { candidateList, voteList } = paramCompany();
    const candidateIndex = parseInt($(event.currentTarget).attr('data-show-supporter'), 10);

    templateInstance.selectedCandidateInfo.set({
      candidateId: candidateList[candidateIndex],
      voteList: voteList[candidateIndex]
    });
  }
});
