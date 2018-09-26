import { getCompanyMetaTag } from '/server/startup/metaTag/getCompanyMetaTag';
import { getFoundationMetaTag } from '/server/startup/metaTag/getFoundationMetaTag';
import { getViolationCaseMetaTag } from '/server/startup/metaTag/getViolationCaseMetaTag';

const routeList = [
  { routePath: '/company/detail', getCustomMetaTag: getCompanyMetaTag },
  { routePath: '/foundation/view', getCustomMetaTag: getFoundationMetaTag },
  { routePath: '/violation/view', getCustomMetaTag: getViolationCaseMetaTag }
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
