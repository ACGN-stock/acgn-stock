'use strict';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';

export const isLoading = new ReactiveVar(false);
export default isLoading;

Template.loading.helpers({
  loadingOverlayClass() {
    return isLoading.get() ? 'loadingOverlay' : 'loadingOverlay d-none';
  }
});
