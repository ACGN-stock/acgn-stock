import { ReactiveVar } from 'meteor/reactive-var';

const currentPage = new ReactiveVar('personalInfo');
export const controller = {
  set currentPage(val) {
    return currentPage.set(val);
  },
  get currentPage() {
    return currentPage.get();
  }
};
export default controller;

