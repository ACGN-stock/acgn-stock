import { getCompanyMetaTag } from '/server/startup/metaTag/getCompanyMetaTag';
import { getFoundationMetaTag } from '/server/startup/metaTag/getFoundationMetaTag';
import { getAccountInfoMetaTag } from '/server/startup/metaTag/getAccountInfoMetaTag';
import { getViolationCaseMetaTag } from '/server/startup/metaTag/getViolationCaseMetaTag';
import { getAnnouncementMetaTag } from '/server/startup/metaTag/getAnnouncementMetaTag';
import { getRuleAgendaMetaTag } from '/server/startup/metaTag/getRuleAgendaMetaTag';

const routeList = [
  { routePath: '/company/detail', getCustomMetaTag: getCompanyMetaTag },
  { routePath: '/foundation/view', getCustomMetaTag: getFoundationMetaTag },
  { routePath: '/accountInfo', getCustomMetaTag: getAccountInfoMetaTag },
  { routePath: '/violation/view', getCustomMetaTag: getViolationCaseMetaTag },
  { routePath: '/announcement/view', getCustomMetaTag: getAnnouncementMetaTag },
  { routePath: '/ruleDiscuss/view', getCustomMetaTag: getRuleAgendaMetaTag }
];

export function getCustomMetaTagByPathname(pathname) {
  for (const { routePath, getCustomMetaTag } of routeList) {
    const id = matchPathnameWithRoutePath(pathname, routePath);
    if (id) {
      return getCustomMetaTag(id);
    }
  }

  return null;
}

function matchPathnameWithRoutePath(pathname, routePath) {
  const tripIdRegExp = new RegExp(`${routePath}/([0123456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{17})`);
  const match = pathname.match(tripIdRegExp);
  if (! match || match.length > 2) {
    return null;
  }

  return match[1];
}
