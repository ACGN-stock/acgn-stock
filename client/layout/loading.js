'use strict';
import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';

const isLoading = new ReactiveVar(false);
let taskCount = 0;
export function addTask() {
  taskCount += 1;
  isLoading.set(true);
}
export function resolveTask() {
  taskCount -= 1;
  if (taskCount <= 0) {
    isLoading.set(false);
  }
}

Template.loading.helpers({
  loadingOverlayClass() {
    return isLoading.get() ? 'loadingOverlay' : 'loadingOverlay d-none';
  }
});
