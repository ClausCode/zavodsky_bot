export interface Payment {
  id: string;
  userId: number;
  amount: number;
  productName: string;
  status: "pending" | "succeeded" | "canceled";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentData {
  userId: number;
  amount: number;
  productName: string;
}

export interface Subscription {
  userId: number;
  endDate: Date;
  isActive: boolean;
}
