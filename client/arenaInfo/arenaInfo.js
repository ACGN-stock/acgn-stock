import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { inheritedShowLoadingOnSubscribing } from '/client/layout/loading';
import { getCurrentArena } from '/db/dbArena';
import { paramArenaId, paramArena, isArenaEnded, isArenaJoinEnded } from './helpers';

inheritedShowLoadingOnSubscribing(Template.arenaInfo);

Template.arenaInfo.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const arenaId = paramArenaId();

    if (! arenaId) {
      const currentArena = getCurrentArena();

      if (currentArena) {
        FlowRouter.setParams({ arenaId: currentArena._id });
      }

      return;
    }

    this.subscribe('arenaInfo', arenaId);
  });
});

Template.arenaInfo.helpers({
  paramArena,
  isArenaEnded,
  isArenaJoinEnded,
  fighterListTitle() {
    return isArenaEnded() ? '優勝者列表' : '參賽者列表';
  }
});
