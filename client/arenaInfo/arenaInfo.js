import { Template } from 'meteor/templating';

import { inheritedShowLoadingOnSubscribing } from '/client/layout/loading';
import { paramArenaId, paramArena, isArenaEnded, isArenaJoinEnded } from './helpers';

inheritedShowLoadingOnSubscribing(Template.arenaInfo);

Template.arenaInfo.onCreated(function() {
  this.autorunWithIdleSupport(() => {
    const arenaId = paramArenaId();

    if (! arenaId) {
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
