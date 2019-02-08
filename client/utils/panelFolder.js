import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';

import { getCurrentPage } from '/routes';

const panelFolderStates = new ReactiveDict('panelFolderStates');

function getPanelFolderKey(name) {
  const pageName = getCurrentPage();

  return `${pageName}_${name}`;
}

Template.panelFolder.onCreated(function() {
  this.key = getPanelFolderKey(this.data.name);

  this.getState = () => {
    return panelFolderStates.get(this.key);
  };

  this.setState = (state) => {
    panelFolderStates.set(this.key, state);
  };

  this.toggleState = () => {
    this.setState(! this.getState());
  };

  panelFolderStates.setDefault(this.key, false);
});

Template.panelFolder.helpers({
  key() {
    return Template.instance().key;
  },
  isExpanded() {
    return Template.instance().getState();
  },
  folderIconClass() {
    return Template.instance().getState() ? 'fa-folder-open' : 'fa-folder';
  }
});

Template.panelFolder.events({
  'click [data-action="togglePanelFolder"]'(event, templateInstance) {
    event.preventDefault();

    const currentTargetKey = templateInstance.$(event.currentTarget).attr('data-key');

    // 比對 key 是否一致，防止內部的 panelFolder 開關外部的 panelFolder
    if (currentTargetKey !== templateInstance.key) {
      return;
    }

    templateInstance.toggleState();
  }
});
