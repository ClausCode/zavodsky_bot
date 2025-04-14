export interface SubscriptionProduct {
  name: string;
  price: number;
  duration: number;
}

export type SubscriptionType =
  | "sub_1_month"
  | "sub_3_month"
  | "sub_6_month"
  | "sub_12_month";

export interface SubscriptionProducts {
  [key in SubscriptionType]: SubscriptionProduct;
}
