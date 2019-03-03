import { ReactiveVar } from 'meteor/reactive-var';
import { Template } from 'meteor/templating';
import { setPrerenderDataReady } from '/client/utils/prerenderReady';

const isLoading = new ReactiveVar(false);
let taskCount = 0;
export function addTask() {
  taskCount += 1;
  isLoading.set(true);
  setPrerenderDataReady(false);
}
export function resolveTask() {
  taskCount -= 1;
  if (taskCount <= 0) {
    isLoading.set(false);
    setPrerenderDataReady(true);
  }
}
export function inheritedShowLoadingOnSubscribing(template) {
  template.onCreated(function() {
    const rIsDataReady = new ReactiveVar(false);
    this.autorun(() => {
      rIsDataReady.set(this.subscriptionsReady());
    });
    this.autorun(() => {
      if (rIsDataReady.get()) {
        resolveTask();
      }
      else {
        addTask();
      }
    });
  });
}

Template.loading.helpers({
  loadingOverlayClass() {
    return isLoading.get() ? 'loadingOverlay' : 'loadingOverlay d-none';
  }
});
