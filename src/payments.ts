import { PrismaClient } from "@prisma/client";
import { Payment, CreatePaymentData } from "./types/payment";
import { checkout } from "./config/yookassa";

const prisma = new PrismaClient();

function mapPayment(payment: any): Payment {
  return {
    ...payment,
    status: payment.status as Payment["status"],
  };
}

export async function createPayment(data: CreatePaymentData): Promise<Payment> {
  const payment = await prisma.payment.create({
    data: {
      ...data,
      status: "pending",
    },
  });
  return mapPayment(payment);
}

export async function updatePaymentStatus(
  yookassaId: string,
  status: Payment["status"]
): Promise<Payment | null> {
  try {
    const existingPayment = await prisma.payment.findUnique({
      where: { yookassaId },
    });

    if (!existingPayment) {
      console.error(`Платеж с yookassaId ${yookassaId} не найден`);
      return null;
    }

    const payment = await prisma.payment.update({
      where: {
        yookassaId: yookassaId,
      },
      data: { status },
    });
    return mapPayment(payment);
  } catch (error) {
    console.error("Ошибка при обновлении статуса платежа:", error);
    return null;
  }
}

export async function getPayment(paymentId: string): Promise<Payment | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });
  return payment ? mapPayment(payment) : null;
}

export async function deletePayment(yookassaId: string): Promise<boolean> {
  try {
    await prisma.payment.delete({
      where: { yookassaId },
    });
    return true;
  } catch (error) {
    console.error("Ошибка при удалении платежа:", error);
    return false;
  }
}

export async function capturePayment(yookassaId: string): Promise<boolean> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { yookassaId },
    });

    if (!payment) {
      console.error(`Платеж с yookassaId ${yookassaId} не найден`);
      return false;
    }

    await checkout.capturePayment(yookassaId, {
      amount: {
        value: payment.amount.toString(),
        currency: "RUB",
      },
    });
    return true;
  } catch (error) {
    console.error("Ошибка при подтверждении платежа:", error);
    return false;
  }
}
