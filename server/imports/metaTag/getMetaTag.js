import { Meteor } from 'meteor/meteor';

import { createMetaName, createMetaProperty } from '/server/imports/metaTag/createMeta';
import { getCustomMetaTagByPathname } from '/server/imports/metaTag/getCustomMetaTagByPathname';

export function getMetaTag(url) {
  let metaTag = getCommonMetaTag();

  const { pathname } = url;
  const customeMetaTag = getCustomMetaTagByPathname(pathname);
  if (customeMetaTag) {
    metaTag += customeMetaTag;
  }
  else {
    metaTag += getDefaultMetaTag();
  }

  return metaTag;
}

function getCommonMetaTag() {
  let metaTag = '';
  metaTag += createMetaName('twitter:card', 'summary');
  metaTag += createMetaProperty('og:image:width', 300);
  metaTag += createMetaProperty('og:image:height', 300);

  return metaTag;
}

function getDefaultMetaTag() {
  let metaTag = '';
  const { websiteName, image, description } = Meteor.settings.public.websiteInfo;
  metaTag += createMetaProperty('og:title', websiteName);
  metaTag += createMetaProperty('og:image', image);
  metaTag += createMetaProperty('og:image:url', image);
  metaTag += createMetaProperty('og:description', description);

  return metaTag;
}
