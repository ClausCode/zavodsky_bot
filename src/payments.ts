import { PrismaClient } from "@prisma/client";
import { Payment, CreatePaymentData } from "./types/payment";

const prisma = new PrismaClient();

function mapPayment(payment: any): Payment {
  return {
    ...payment,
    status: payment.status as Payment["status"],
  };
}

export async function createPayment(
  data: CreatePaymentData & { yookassaId?: string }
): Promise<Payment> {
  const payment = await prisma.payment.create({
    data: {
      ...data,
      status: "pending",
      yookassaId: data.yookassaId,
    },
  });
  return mapPayment(payment);
}

export async function updatePaymentStatus(
  yookassaId: string,
  status: Payment["status"]
): Promise<Payment> {
  const payment = await prisma.payment.update({
    where: { yookassaId },
    data: { status },
  });
  return mapPayment(payment);
}

export async function getPayment(paymentId: string): Promise<Payment | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });
  return payment ? mapPayment(payment) : null;
}
