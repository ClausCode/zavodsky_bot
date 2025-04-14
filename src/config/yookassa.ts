import { YooCheckout, ICreatePayment } from "@a2seven/yoo-checkout";
import { SubscriptionProducts } from "../types/product";

const shopId = process.env.YOOKASSA_SHOP_ID;
const secretKey = process.env.YOOKASSA_SECRET_KEY;

if (!shopId || !secretKey) {
  throw new Error(
    "YOOKASSA_SHOP_ID и YOOKASSA_SECRET_KEY должны быть указаны в .env файле"
  );
}

export const checkout = new YooCheckout({ shopId, secretKey });

export const subscriptionProducts: SubscriptionProducts = {
  sub_1_month: {
    name: "Подписка на 1 месяц",
    price: 100, // 100 рублей
    duration: 1,
  },
  sub_3_month: {
    name: "Подписка на 3 месяца",
    price: 250, // 250 рублей
    duration: 3,
  },
  sub_6_month: {
    name: "Подписка на 6 месяцев",
    price: 450, // 450 рублей
    duration: 6,
  },
  sub_12_month: {
    name: "Подписка на 12 месяцев",
    price: 800, // 800 рублей
    duration: 12,
  },
} as const;
