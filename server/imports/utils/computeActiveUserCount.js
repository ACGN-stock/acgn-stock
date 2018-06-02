import { computeActiveUserIds } from './computeActiveUserIds';

export function computeActiveUserCount() {
  return computeActiveUserIds().length;
}
