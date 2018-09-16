import { onPageLoad } from 'meteor/server-render';

import { dbCompanies } from '/db/dbCompanies';

const defaultMetaTags = `
  <meta property="og:title"       content="ACGN 股票交易市場" />
  <meta property="og:description" content="漲停!!" />
  <meta property="og:image"       content="/ms-icon-310x310.png" />
`;

function extractCompanyId(pathname) {
  const tripIdRegExp = new RegExp('/company/detail/([0123456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz]{17})');
  const match = pathname.match(tripIdRegExp);
  if (! match || match.length > 2) {
    return null;
  }

  return match[1];
}

function createMetaTag(property, content) {
  return `<meta property="${property}" content="${content}" />`;
}

onPageLoad((sink) => {
  const { pathname } = sink.request.url;
  const companyId = extractCompanyId(pathname);
  const company = companyId ? dbCompanies.findOne({ _id: companyId }, { fileds: { companyName: 1, pictureBig: 1, description: 1 } }) : null;

  if (company) {
    const title = company.companyName;
    const description = company.description;
    const image = company.pictureBig;
    sink.appendToHead(createMetaTag('og:title', title));
    sink.appendToHead(createMetaTag('og:description', description));
    sink.appendToHead(createMetaTag('og:image', image));
  }
  else {
    sink.appendToHead(defaultMetaTags);
  }
});
