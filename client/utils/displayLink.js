'use strict';
import { $ } from 'meteor/jquery';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';

Template.userLink.onRendered(function() {
  const userId = this.data;
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
      url: '/userName',
      data: {
        id: userId
      },
      success: (userName) => {
        const path = FlowRouter.path('accountInfo', {userId});
        $link
          .attr('href', path)
          .text(('' + userName).trim() || '???');
      },
      error: () => {
        $link.text('???');
      }
    });
  }
});

Template.companyLink.onRendered(function() {
  const companyId = this.data;
  if (companyId) {
    const $link = this.$('a');
    $.ajax({
      url: '/companyName',
      data: {
        id: companyId
      },
      success: (companyName) => {
        const path = FlowRouter.path('companyDetail', {companyId});
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

Template.foundationLink.onRendered(function() {
  const foundationId = this.data;
  if (foundationId) {
    const $link = this.$('a');
    $.ajax({
      url: '/foundationName',
      data: {
        id: foundationId
      },
      success: (foundationName) => {
        const path = FlowRouter.path('foundationDetail', {foundationId});
        $link
          .attr('href', path)
          .text(foundationName || '???');
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
      url: '/productName',
      data: {
        id: productId
      },
      dataType: 'json',
      success: (productData) => {
        $link
          .attr('href', productData.url)
          .text(productData.productName || '???');
      },
      error: () => {
        $link.text('???');
      }
    });
  }
});
