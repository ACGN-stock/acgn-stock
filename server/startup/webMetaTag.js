import { onPageLoad } from 'meteor/server-render';
import { getMetaTag } from '/server/imports/metaTag/getMetaTag';

onPageLoad((sink) => {
  const metaTag = getMetaTag(sink.request.url);
  sink.appendToHead(metaTag);
});
