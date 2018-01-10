import { $ } from 'meteor/jquery';
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { dbProducts, productTypeList } from '/db/dbProducts';
import { alertDialog } from '../layout/alertDialog';
import { sanitizeHtml } from '../utils/helpers';

Template.editCompanySwitchContentManageProducts.onCreated(function() {
  this.rInAddProductMode = new ReactiveVar(false);
});

Template.editCompanySwitchContentManageProducts.helpers({
  inAddMode() {
    return Template.instance().rInAddProductMode.get();
  },
  formArgs() {
    const templateInstance = Template.instance();

    return {
      company: templateInstance.data.company,
      product: {
        productName: '',
        companyId: this.company._id,
        type: productTypeList[0],
        url: ''
      },
      onReset() {
        templateInstance.rInAddProductMode.set(false);
      },
      onSave() {
        templateInstance.rInAddProductMode.set(false);
      }
    };
  },
  productList() {
    return dbProducts.find({
      companyId: this.company._id,
      state: 'planning'
    }, {
      sort: { createdAt: 1 }
    });
  }
});

Template.editCompanySwitchContentManageProducts.events({
  'click [data-action="addProduct"]'(event, templateInstance) {
    event.preventDefault();
    templateInstance.rInAddProductMode.set(true);
  },
  'click [data-remove-product]'(event) {
    const productId = $(event.currentTarget).attr('data-remove-product');
    const productData = dbProducts.findOne(productId);
    if (productData) {
      alertDialog.confirm({
        message: `確定要刪除「${sanitizeHtml(productData.productName)}」這項待上架產品嗎？`,
        callback: (result) => {
          if (result) {
            Meteor.customCall('removeProduct', productId);
          }
        }
      });
    }
  }
});
