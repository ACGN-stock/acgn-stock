'use strict';
import { alertDialog } from '../layout/alertDialog';

export function handleError(error) {
  alertDialog.alert(error.reason + ' [' + error.error + ']');
}
export default handleError;
