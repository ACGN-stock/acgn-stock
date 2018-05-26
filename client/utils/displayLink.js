import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

Template.userLink.onRendered(function() {
  let userId = this.data;

  if (typeof userId === 'object') {
    userId = this.data.id;
  }

  if (userId === '!none') {
    this.$('a').text('無');
  }
  else if (userId === '!system') {
    this.$('a').text('系統');
  }
  else if (userId === '!FSC') {
    this.$('a').text('金管會');
  }
  else if (userId) {
    const $link = this.$('a');
    $.ajax({
      url: '/userInfo',
      data: {
        id: userId
      },
      dataType: 'json',
      success: (userData) => {
        const userName = userData.name;
        if (userData.status === 'registered') {
          const path = FlowRouter.path('accountInfo', { userId });
          $link
            .attr('href', path)
            .text(('' + userName).trim() || '???');
        }
        else {
          $link.wrapInner('<span></sapn>');
          $link.find('span')
            .text(('' + userName).trim() || '???')
            .unwrap();
        }
      },
      error: () => {
        $link.text('???');
      }
    });
  }
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
        const companyName = companyData.name;
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
