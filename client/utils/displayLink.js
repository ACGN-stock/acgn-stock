import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

import { populateUserLink } from '/client/utils/populateUserLink';

Template.userLink.onRendered(function() {
  this.autorun(() => {
    const data = Template.currentData();
    const userId = typeof data === 'object' ? data.id : data;
    populateUserLink(this.$('span'), userId);
  });
});

Template.companyLink.onRendered(function() {
  let companyId = this.data;

  if (typeof companyId === 'object') {
    companyId = this.data.id;
  }

  if (companyId) {
    const $link = this.$('a');
    $.ajax({
      url: '/companyInfo',
      data: {
        id: companyId
      },
      dataType: 'json',
      success: (companyData) => {
        const { companyName } = companyData;
        let path;
        switch (companyData.status) {
          case 'foundation': {
            path = FlowRouter.path('foundationDetail', {
              foundationId: companyId
            });
            break;
          }
          case 'market': {
            path = FlowRouter.path('companyDetail', { companyId });
            break;
          }
        }
        $link
          .attr('href', path)
          .text(companyName || '???');
      },
      error: () => {
        $link.text('???');
      }
    });
  }
});

Template.productLink.onRendered(function() {
  const productId = this.data;
  if (productId) {
    const $link = this.$('a');
    $.ajax({
      url: '/productInfo',
      data: {
        id: productId
      },
      dataType: 'json',
      success: ({ productName, url, type }) => {
        $link
          .attr('href', url)
          .attr('title', productName || '???')
          .data('producttype', type)
          .text(productName || '???');
      },
      error: () => {
        $link.text('???');
      }
    });
  }
});
