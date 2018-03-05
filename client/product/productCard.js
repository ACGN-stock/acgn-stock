import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { $ } from 'meteor/jquery';

import { dbProducts } from '/db/dbProducts';
import { getAvailableProductTradeQuota } from '/db/dbUserOwnedProducts';
import { voteProduct, adminEditProduct } from '../utils/methods';
import { currencyFormat } from '../utils/helpers';
import { alertDialog } from '../layout/alertDialog';

Template.productCard.helpers({
  isAdmin() {
    const user = Meteor.user();

    return user && user.profile.isAdmin;
  },
  soldAmount() {
    const { product } = Template.currentData();
    const { totalAmount, stockAmount, availableAmount } = product;

    return totalAmount - stockAmount - availableAmount;
  }
});

Template.productCard.events({
  'click [data-vote-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-vote-product');
    voteProduct(productId);
  },
  'click [data-ban-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-ban-product');
    alertDialog.dialog({
      type: 'prompt',
      title: '違規處理 - 產品下架',
      message: `請輸入處理事由：`,
      callback: function(message) {
        if (message) {
          Meteor.customCall('banProduct', { productId, message });
        }
      }
    });
  },
  'click [data-edit-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-edit-product');
    adminEditProduct(productId);
  },
  'click [data-buy-product]'(event) {
    event.preventDefault();
    const productId = $(event.currentTarget).attr('data-buy-product');

    const { companyId, price, availableAmount } = dbProducts.findOne(productId);

    const tradeQuota = getAvailableProductTradeQuota({
      userId: Meteor.userId(),
      companyId
    });

    if (tradeQuota < price) {
      alertDialog.alert('您的剩餘購買額度不足！');

      return;
    }

    const { money, vouchers } = Meteor.user().profile;
    const spendables = money + vouchers;
    if (spendables < price) {
      alertDialog.alert('您的剩餘現金不足！');

      return;
    }

    if (availableAmount <= 0) {
      alertDialog.alerg('該產品已無剩餘數量！');

      return;
    }

    const maxAmount = Math.min(
      availableAmount,
      Math.floor(spendables / price),
      Math.floor(tradeQuota / price));

    alertDialog.dialog({
      type: 'prompt',
      inputType: 'number',
      title: '購買產品 - 輸入數量',
      message: `請輸入數量：(1~${maxAmount})`,
      callback: (result) => {
        if (! result) {
          return;
        }

        const amount = parseInt(result, 10);

        if (! amount || amount <= 0 || amount > maxAmount) {
          alertDialog.alert('不正確的數量設定！');

          return;
        }

        const totalCost = amount * price;
        const voucherCost = Math.min(totalCost, vouchers);
        const moneyCost = totalCost - voucherCost;

        const costMessageList = [];
        if (voucherCost > 0) {
          costMessageList.push(`消費券$${currencyFormat(voucherCost)}`);
        }
        if (moneyCost > 0) {
          costMessageList.push(`現金$${currencyFormat(moneyCost)}`);
        }

        alertDialog.confirm({
          title: '購買產品 - 確認花費',
          message: `確定要花費${costMessageList.join('以及')}來購買產品？`,
          callback: (confirmResult) => {
            if (! confirmResult) {
              return;
            }

            Meteor.customCall('buyProduct', { productId, amount });
          }
        });
      }
    });
  }
});
