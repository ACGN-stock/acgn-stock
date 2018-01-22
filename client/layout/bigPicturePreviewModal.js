import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

const rShowBigPicturePreviewModal = new ReactiveVar(false);
const pictureSrc = new ReactiveVar('');
let switchControl = null;

export const bigPicturePreviewModal = {
  show: function(options) {
    pictureSrc.set(options.src);
    switchControl = options.switch;
    rShowBigPicturePreviewModal.set(true);
  }
};

Template.bigPicturePreviewModal.helpers({
  modalClass() {
    return (rShowBigPicturePreviewModal.get() === true)
      ? 'd-block big-picture-preivew modal fade show' : 'd-block big-picture-preivew modal fade';
  },
  src() {
    return pictureSrc.get();
  }
});
Template.bigPicturePreviewModal.events({
  'click div.modal'() {
    rShowBigPicturePreviewModal.set(false);
    if (switchControl) {
      switchControl.set('');
      switchControl = null;
    }
  }
});
