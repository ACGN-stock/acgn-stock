import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

Template.userLink.onRendered(function() {
  this.refreshContent = (userId) => {
    const $link = this.$('a');

    if (! userId) {
      $link.text('（無資料）');

      return;
    }

    if (userId === '!none') {
      $link.text('無');

      return;
    }

    if (userId === '!system') {
      $link.text('系統');

      return;
    }

    if (userId === '!FSC') {
      $link.text('金管會');

      return;
    }

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
  };

  this.autorun(() => {
    const data = Template.currentData();
    const userId = typeof data === 'object' ? data.id : data;
    this.refreshContent(userId);
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
