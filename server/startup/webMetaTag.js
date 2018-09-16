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
  const { companyName, pictureSmall } = companyData;
  sink.appendToHead(createMetaTag('og:title', companyName));
  sink.appendToHead(createMetaTag('og:image', pictureSmall));
  sink.appendToHead(createMetaTag('og:description', createCompanyDescription(companyData)));
}

function createCompanyDescription({ listPrice, capital, totalValue, description }) {
  return `價格:${listPrice}   市值:${capital}   資本額:${totalValue}
    ${description}
  `;
}


function createMetaTag(property, content) {
  return `<meta property="${property}" content="${content}" />`;
}

function getCompanyData(companyId) {
  return dbCompanies.findOne({ _id: companyId },
    {
      fileds: {
        companyName: 1,
        pictureSmall: 1,
        description: 1,
        listPrice: 1,
        capital: 1,
        totalValue: 1
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
