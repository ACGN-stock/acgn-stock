import { onPageLoad } from 'meteor/server-render';

import { dbCompanies } from '/db/dbCompanies';

onPageLoad((sink) => {
  const { pathname } = sink.request.url;
  const companyId = extractCompanyId(pathname);
  const companyData = companyId ? getCompanyData(companyId) : null;

  if (companyData) {
    appendCompanyMetaTag(sink, companyData);
  }
  else {
    appendDefaultMetaTag(sink);
  }
});

function appendDefaultMetaTag(sink) {
  sink.appendToHead(createMetaTag('og:title', 'ACGN 股票交易市場'));
  sink.appendToHead(createMetaTag('og:description', '漲停!!'));
  sink.appendToHead(createMetaTag('og:image', '/ms-icon-310x310.png'));
}

function appendCompanyMetaTag(sink, companyData) {
  sink.appendToHead(createMetaTag('og:title', companyData.companyName));
  sink.appendToHead(createMetaTag('og:description', companyData.description));
  sink.appendToHead(createMetaTag('og:image', companyData.pictureBig));
}


function createMetaTag(property, content) {
  return `<meta property="${property}" content="${content}" />`;
}

function getCompanyData(companyId) {
  return dbCompanies.findOne({ _id: companyId },
    {
      fileds: {
        companyName: 1,
        pictureBig: 1,
        description: 1
      }
    });
}

function extractCompanyId(pathname) {
  const tripIdRegExp = new RegExp('/company/detail/([0123456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{17})');
  const match = pathname.match(tripIdRegExp);
  if (! match || match.length > 2) {
    return null;
  }

  return match[1];
}
