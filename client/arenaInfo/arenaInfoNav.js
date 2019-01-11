import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { dbArena } from '/db/dbArena';
import { paramArenaId, paramArena } from './helpers';

Template.arenaInfoNav.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const arenaId = paramArenaId();

    if (! arenaId) {
      return;
    }

    this.subscribe('adjacentArena', arenaId);
  });
});

function getPreviousArena() {
  const arena = paramArena();

  return arena && dbArena.findOne({ beginDate: { $lt: arena.beginDate } }, { sort: { beginDate: -1 } });
}

function getNextArena() {
  const arena = paramArena();

  return arena && dbArena.findOne({ beginDate: { $gt: arena.beginDate } }, { sort: { beginDate: 1 } });
}

Template.arenaInfoNav.helpers({
  prevButtonDisabledClass() {
    return getPreviousArena() ? '' : 'disabled';
  },
  prevButtonHref() {
    const previousArena = getPreviousArena();

    return previousArena ? FlowRouter.path('arenaInfo', { arenaId: previousArena._id }) : '#';
  },
  nextButtonDisabledClass() {
    return getNextArena() ? '' : 'disabled';
  },
  nextButtonHref() {
    const nextArena = getNextArena();

    return nextArena ? FlowRouter.path('arenaInfo', { arenaId: nextArena._id }) : '#';
  },
  arenaBegin() {
    const currentArena = paramArena();

    return currentArena ? currentArena.beginDate : null;
  },
  arenaEnd() {
    const currentArena = paramArena();

    return currentArena ? currentArena.endDate : null;
  }
});
