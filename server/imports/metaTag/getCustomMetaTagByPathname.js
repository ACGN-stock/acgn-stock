import { getCompanyMetaTag } from '/server/imports/metaTag/getCompanyMetaTag';
import { getFoundationMetaTag } from '/server/imports/metaTag/getFoundationMetaTag';
import { getAccountInfoMetaTag } from '/server/imports/metaTag/getAccountInfoMetaTag';
import { getViolationCaseMetaTag } from '/server/imports/metaTag/getViolationCaseMetaTag';
import { getAnnouncementMetaTag } from '/server/imports/metaTag/getAnnouncementMetaTag';
import { getRuleAgendaMetaTag } from '/server/imports/metaTag/getRuleAgendaMetaTag';

export function getCustomMetaTagByPathname(pathname) {
  const routePathAndId = getRoutePathAndId(pathname);
  if (! routePathAndId) {
    return null;
  }

  return getCustomMetaTag(routePathAndId.routePath, routePathAndId.id);
}


const tripIdRegExp = new RegExp(`/([0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/]{1,})/([23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{17})`);

function getRoutePathAndId(pathname) {
  const match = pathname.match(tripIdRegExp);
  if (! match) {
    return null;
  }

  return { routePath: match[1], id: match[2] };
}


const routeMetaTagMap = {
  'company/detail': getCompanyMetaTag,
  'foundation/view': getFoundationMetaTag,
  'accountInfo': getAccountInfoMetaTag,
  'violation/view': getViolationCaseMetaTag,
  'announcement/view': getAnnouncementMetaTag,
  'ruleDiscuss/view': getRuleAgendaMetaTag
};

function getCustomMetaTag(routePath, id) {
  const getRouteMetaTag = routeMetaTagMap[routePath];
  if (! getRouteMetaTag) {
    return null;
  }

  return getRouteMetaTag(id);
}
