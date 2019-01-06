import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbArena } from '/db/dbArena';

export function paramArenaId() {
  return FlowRouter.getParam('arenaId');
}

export function paramArena() {
  const arenaId = paramArenaId();

  return arenaId ? dbArena.findOne(arenaId) : null;
}

export function isArenaEnded() {
  const arena = paramArena();

  return arena && arena.endDate && arena.endDate.getTime() < Date.now();
}

export function isArenaJoinEnded() {
  const arena = paramArena();

  return arena && arena.joinEndDate && arena.joinEndDate.getTime() < Date.now();
}
