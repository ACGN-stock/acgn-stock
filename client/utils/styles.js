'use strict';
import { ReactiveVar } from 'meteor/reactive-var';

export const rMainTheme = new ReactiveVar('light', function(oldValue, newValue) {
  if (oldValue === newValue) {
    return true;
  }
  localStorage.setItem('theme', newValue);

  return false;
});
export const rCompanyListViewMode = new ReactiveVar('card', function(oldValue, newValue) {
  if (oldValue === newValue) {
    return true;
  }
  localStorage.setItem('company-list-view-mode', newValue);

  return false;
});

//每次開啟網頁時只確認一次預設theme
if (! localStorage.getItem('theme')) {
  localStorage.setItem('theme', 'light');
}
else {
  rMainTheme.set(localStorage.getItem('theme'));
}
if (! localStorage.getItem('company-list-view-mode')) {
  localStorage.setItem('company-list-view-mode', 'card');
}
else {
  rCompanyListViewMode.set(localStorage.getItem('company-list-view-mode'));
}
