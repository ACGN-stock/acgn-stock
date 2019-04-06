import { getCurrentPage } from '/routes';

let prerenderDataReady = false;
let prerenderTitleReady = false;

export function setPrerenderDataReady(ready) {
  prerenderDataReady = ready;
  setPrerenderReady();
}

export function setPrerenderTitleReady(ready) {
  prerenderTitleReady = ready;
  setPrerenderReady();
}


function setPrerenderReady() {
  window.prerenderReady = isPrerenderReady();
}

function isPrerenderReady() {
  if (! prerenderDataReady) {
    return false;
  }

  if (isNeedResetTitlePage() && (! prerenderTitleReady)) {
    return false;
  }

  return true;
}

const resetTitlePageList = ['companyDetail', 'accountInfo', 'foundationDetail', 'ruleAgendaDetail', 'ruleAgendaVote'];
function isNeedResetTitlePage() {
  if (resetTitlePageList.includes(getCurrentPage())) {
    return true;
  }
  else {
    return false;
  }
}
