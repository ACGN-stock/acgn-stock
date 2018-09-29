import { getCompanyMetaTag } from '/server/imports/metaTag/getCompanyMetaTag';
import { getFoundationMetaTag } from '/server/imports/metaTag/getFoundationMetaTag';
import { getAccountInfoMetaTag } from '/server/imports/metaTag/getAccountInfoMetaTag';
import { getViolationCaseMetaTag } from '/server/imports/metaTag/getViolationCaseMetaTag';
import { getAnnouncementMetaTag } from '/server/imports/metaTag/getAnnouncementMetaTag';
import { getRuleAgendaMetaTag } from '/server/imports/metaTag/getRuleAgendaMetaTag';

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
