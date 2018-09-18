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
  metaTag += createMetaProperty('og:title', Meteor.settings.public.websiteName);
  metaTag += createMetaProperty('og:image', 'https://acgn-stock.com/ms-icon-310x310.png');
  metaTag += createMetaProperty('og:image:url', 'https://acgn-stock.com/ms-icon-310x310.png');
  metaTag += createMetaProperty('og:description', '漲停!!');

  return metaTag;
}
