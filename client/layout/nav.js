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
Template.nav.onCreated(function() {
  this.autorun(() => {
    if (dbResourceLock.find('season').count()) {
      return false;
    }
    this.subscribe('currentSeason');
  });
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
  }
});
Template.nav.events({
  'click [data-action="login"]'(event) {
    event.preventDefault();
    rShowLoginDialog.set(true);
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
    $('#boostrap-theme').attr('href', event.target.getAttribute('rel'));
    $('nav').removeClass('navbar-light navbar-inverse').addClass(event.target.getAttribute('nav-class'));
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
