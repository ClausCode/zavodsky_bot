export interface Payment {
  id: string;
  userId: number;
  amount: number;
  productName: string;
  status: "pending" | "succeeded" | "canceled";
  yookassaId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentData {
  userId: number;
  amount: number;
  productName: string;
  yookassaId?: string;
}

export interface Subscription {
  userId: number;
  endDate: Date;
  isActive: boolean;
}
