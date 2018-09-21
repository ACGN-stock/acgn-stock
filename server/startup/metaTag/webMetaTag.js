import { Meteor } from 'meteor/meteor';
import { onPageLoad } from 'meteor/server-render';

import { createMetaName, createMetaProperty } from '/server/startup/metaTag/createMeta';
import { getCustomMetaTagByPathname } from '/server/startup/metaTag/getCustomMetaTagByPathname';

onPageLoad((sink) => {
  let metaTag = getCommonMetaTag();

  const { pathname } = sink.request.url;
  const customeMetaTag = getCustomMetaTagByPathname(pathname);
  if (customeMetaTag) {
    metaTag += customeMetaTag;
  }
  else {
    metaTag += getDefaultMetaTag();
  }

  sink.appendToHead(metaTag);
});

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
