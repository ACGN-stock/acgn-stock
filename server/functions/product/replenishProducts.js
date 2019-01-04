import { dbProducts } from '/db/dbProducts';
import { executeBulksSync } from '/server/imports/utils/executeBulksSync';
import PD from 'probability-distributions';
import { MathUtil } from '/common/imports/utils/MathUtil';

// 計算產品補貨的基準值
function getBaseAmount(product) {
  return product[product.replenishBaseAmountType];
}

// 計算產品補貨的隨機乘數
function getAmountFactor(product) {
  switch (product.replenishBatchSizeType) {
    case 'verySmall': {
      // 0% ~ 10%，Beta(3,7) 分佈（期望值 3%）
      return PD.rbeta(1, 3, 7)[0] * 0.1;
    }
    case 'small': {
      // 5% ~ 7%
      return 0.05 + Math.random() * 0.02;
    }
    case 'medium': {
      // 7% ~ 30%
      return 0.07 + Math.random() * 0.23;
    }
    case 'large': {
      // 30% ~ 50%
      return 0.3 + Math.random() * 0.2;
    }
    case 'veryLarge': {
      // 50% ~ 100%
      return 0.5 + Math.random() * 0.5;
    }
  }
}

// 計算產品補貨的隨機數量
function getReplenishAmount(product) {
  const baseAmount = getBaseAmount(product);
  const factor = getAmountFactor(product);

  // 最少釋出 1 個、最多全部釋出
  return MathUtil.clamp(Math.round(baseAmount * factor), 1, product.stockAmount);
}

// 對全部上市產品進行補貨
export function replenishProducts({ finalSale } = { finalSale: false }) {
  const productBulk = dbProducts.rawCollection().initializeUnorderedBulkOp();

  dbProducts
    .find({ state: 'marketing', stockAmount: { $gt: 0 } })
    .forEach((product) => {
      const replenishAmount = finalSale ? product.stockAmount : getReplenishAmount(product);
      productBulk.find({ _id: product._id }).updateOne({
        $inc: {
          availableAmount: replenishAmount,
          stockAmount: -replenishAmount
        }
      });
    });

  executeBulksSync(productBulk);
}
