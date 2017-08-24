'use strict';
import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbSeason } from '../../db/dbSeason';
import { dbResourceLock } from '../../db/dbResourceLock';
import { pageNameHash } from '../../routes';
import { rShowLoginDialog } from './validateDialog';

const rNavLinkListCollapsed = new ReactiveVar(true);

export function updateTheme() {
  const theme = localStorage.getItem('theme');
  $('#nav').removeClass('navbar-light navbar-inverse');
  if (theme === 'light') {
    $('#boostrap-theme').attr('href', 'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.6/css/bootstrap.min.css');
    $('#nav').addClass('navbar-light');
  } else {
    $('#boostrap-theme').attr('href', 'https://cdnjs.cloudflare.com/ajax/libs/bootswatch/4.0.0-alpha.6/solar/bootstrap.min.css');
    $('#nav').addClass('navbar-inverse');
  }
}

Template.nav.onCreated(function() {
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    this.subscribe('currentSeason');
  });
});
Template.nav.onRendered(function() {
  const theme = localStorage.getItem('theme');
  if (!theme) {
    localStorage.setItem('theme', 'light');
  };
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
  seasonParams() {
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
  }
});
Template.nav.events({
  'click [data-login]'(event) {
    event.preventDefault();
    const loginType = $(event.currentTarget).attr('data-login');
    if (loginType === 'PTT') {
      rShowLoginDialog.set(true);
    }
    else if (loginType === 'Facebook') {
      if (location.protocol === 'https:') {
        Meteor.loginWithFacebook();
      }
      else {
        location.href = 'https://' + location.hostname + location.pathname;
      }
    }
    else {
      Meteor['loginWith' + loginType]();
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
    localStorage.setItem('theme', theme);
    updateTheme();
  },
  'click [data-action="logout"]'(event) {
    event.preventDefault();
    Meteor.logout();
  }
});

Template.navLink.helpers({
  getClassList() {
    return 'nav-item' + (FlowRouter.getRouteName() === this.page ? ' active' : '');
  },
  getHref() {
    return FlowRouter.path(this.page, this.params);
  },
  getLinkText() {
    return pageNameHash[this.page];
  }
});
