'use strict';

export function handleError(error) {
  window.alert(error.reason + ' [' + error.error + ']');
}
export default handleError;
