import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';

const panelFolderStates = new ReactiveDict('panelFolderStates');

function getSessionKey(name) {
  return `panelFolder_${name}_expanded`;
}

Template.panelFolder.onCreated(function() {
  panelFolderStates.setDefault(getSessionKey(this.data.name), false);
});

Template.panelFolder.helpers({
  isExpanded() {
    return panelFolderStates.get(getSessionKey(this.name));
  },
  folderIconClass() {
    return panelFolderStates.get(getSessionKey(this.name)) ? 'fa-folder-open' : 'fa-folder';
  }
});

Template.panelFolder.events({
  'click [data-toggle-panel-folder]'(event, templateInstance) {
    event.preventDefault();

    const { name } = templateInstance.data;

    // 防止內部的 panelFolder 開關外部的 panelFolder
    if (templateInstance.$(event.currentTarget).attr('data-toggle-panel-folder') !== name) {
      return;
    }

    const key = getSessionKey(templateInstance.data.name);
    panelFolderStates.set(key, ! panelFolderStates.get(key));
  }
});
