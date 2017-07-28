'use strict';

export function handleError(error) {
  window.alert('[' + error.error + ']' + error.reason);
}
export default handleError;
