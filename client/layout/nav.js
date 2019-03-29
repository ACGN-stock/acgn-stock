import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbArena } from '/db/dbArena';
import { dbSeason } from '/db/dbSeason';
import { stoneTypeList } from '/db/dbCompanyStones';
import {
  getAccessibleControlCenterPageKeys,
  pathForControlCenterPage
} from '/client/controlCenter/helpers';
import { getPageTitle, getCurrentPage } from '/routes';
import { rMainTheme } from '../utils/styles';
import { shouldStopSubscribe } from '../utils/idle';
import { handleError } from '../utils/handleError';
import { globalVariable } from '../utils/globalVariable';
import { rAccountDialogMode } from './accountDialog';

const rNavLinkListCollapsed = new ReactiveVar(true);

function updateTheme() {
  const theme = rMainTheme.get();
  const $nav = $('#nav');

  if (theme === 'light') {
    $('#boostrap-theme').attr('href', 'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.6/css/bootstrap.min.css');
    $nav
      .removeClass('navbar-inverse')
      .addClass('navbar-light');
  }
  else {
    $('#boostrap-theme').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/bootswatch/4.0.0-alpha.6/solar/bootstrap.min.css');
    $nav
      .removeClass('navbar-light')
      .addClass('navbar-inverse');
  }

  globalVariable.set('theme', theme);
}

Template.nav.onCreated(function() {
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    this.subscribe('currentSeason');
    this.subscribe('currentArena');
  });
  this.autorun(() => {
    if (shouldStopSubscribe()) {
      return false;
    }
    if (Meteor.user()) {
      this.subscribe('userFavorite');
    }
  });
});

Template.nav.onRendered(function() {
  updateTheme();
});
Template.nav.helpers({
  getNavLinkListClassList() {
    if (rNavLinkListCollapsed.get()) {
      return 'collapse navbar-collapse';
    }
    else {
      return 'collapse navbar-collapse show';
    }
  },
  hasFavorite() {
    if (! Meteor.user() || ! Meteor.user().favorite) {
      return false;
    }

    return Meteor.user().favorite.length > 0;
  },
  page1() {
    return {
      page: 1
    };
  },
  currentSeasonParams() {
    const seasonData = dbSeason
      .findOne({}, {
        sort: {
          beginDate: -1
        }
      });

    if (seasonData) {
      return {
        seasonId: seasonData._id
      };
    }
    else {
      return {};
    }
  },
  currentArenaParams() {
    const arenaData = dbArena
      .findOne({}, {
        sort: {
          beginDate: -1
        }
      });

    if (arenaData) {
      return {
        arenaId: arenaData._id
      };
    }
    else {
      return {};
    }
  },
  previousSeasonParams() {
    const seasonList = dbSeason
      .find({}, {
        sort: {
          beginDate: -1
        },
        limit: 2
      })
      .fetch();
    const previousSeasonData = seasonList[1] || seasonList[0];

    if (previousSeasonData) {
      return {
        seasonId: previousSeasonData._id
      };
    }
    else {
      return {};
    }
  },
  accountInfoParams() {
    return {
      userId: Meteor.user()._id
    };
  },
  isSSL() {
    return location.protocol === 'https:';
  },
  getHref(page, params) {
    return FlowRouter.path(page, params);
  },
  getLinkText(page) {
    return getPageTitle(page);
  },
  stoneTypeList() {
    return stoneTypeList;
  },
  userStoneCount(user, stoneType) {
    return user.profile.stones[stoneType];
  },
  shouldShowControlCenter() {
    return getAccessibleControlCenterPageKeys().length > 0;
  },
  getAccessibleControlCenterPageKeys,
  pathForControlCenterPage
});
Template.nav.events({
  'click [data-login]'(event) {
    event.preventDefault();
    const loginType = $(event.currentTarget).attr('data-login');
    switch (loginType) {
      case 'PTT': {
        rAccountDialogMode.set('loginPTT');
        break;
      }
      case 'Bahamut': {
        rAccountDialogMode.set('loginBahamut');
        break;
      }
      default: {
        Meteor['loginWith' + loginType]((error) => {
          if (error && error.reason) {
            handleError(error);
          }
        });
        break;
      }
    }
  },
  'click .dropdown .dropdown-toggle'(event) {
    event.preventDefault();
    const $dropdownMenu = $(event.currentTarget).siblings('.dropdown-menu');
    const slideUp = () => {
      $dropdownMenu.slideUp('fast', () => {
        $(document).off('click', slideUp);
        $dropdownMenu.removeClass('show');
      });
    };
    $dropdownMenu.slideDown('fast', () => {
      $dropdownMenu.addClass('show');
      $(document).on('click', slideUp);
    });
  },
  'click button'() {
    rNavLinkListCollapsed.set(! rNavLinkListCollapsed.get());
  },
  'click [data-action="switch-theme"]'(event) {
    event.preventDefault();
    const $switcher = $(event.currentTarget);
    const theme = $switcher.attr('data-theme');
    rMainTheme.set(theme);
    updateTheme();
  },
  'click [data-action="logout"]'(event) {
    event.preventDefault();
    Meteor.logout();
  }
});

Template.navLink.helpers({
  getClassList() {
    return 'nav-item' + (getCurrentPage() === this.page ? ' active' : '');
  },
  getHref() {
    return FlowRouter.path(this.page, this.params);
  },
  getLinkText() {
    return getPageTitle(this.page);
  }
});

Template.navCompanyLink.onRendered(function() {
  const companyId = this.data;
  if (companyId) {
    const $link = this.$('a');
    $.ajax({
      url: '/companyInfo',
      data: {
        id: companyId
      },
      dataType: 'json',
      success: (companyData) => {
        const path = FlowRouter.path('companyDetail', { companyId });
        $link
          .attr('href', path)
          .text(companyData.companyName);
      },
      error: () => {
        $link.text('???');
      }
    });
  }
});
