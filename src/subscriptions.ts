import { PrismaClient } from "@prisma/client";
import { Subscription } from "./types/payment";

const prisma = new PrismaClient();

export async function getSubscription(
  userId: number
): Promise<Subscription | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) return null;

  return {
    userId: subscription.userId,
    endDate: subscription.endDate,
    isActive: subscription.endDate > new Date(),
  };
}

export async function setSubscription(
  userId: number,
  duration: number
): Promise<void> {
  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const endDate = new Date();
  if (existingSubscription && existingSubscription.endDate > new Date()) {
    // Если подписка активна, продлеваем её
    endDate.setMonth(existingSubscription.endDate.getMonth() + duration);
  } else {
    // Если подписки нет или она истекла, создаём новую
    endDate.setMonth(endDate.getMonth() + duration);
  }

  await prisma.subscription.upsert({
    where: { userId },
    update: { endDate },
    create: {
      userId,
      endDate,
    },
  });
}

export async function checkSubscriptionStatus(userId: number): Promise<string> {
  const subscription = await getSubscription(userId);

  if (!subscription) {
    return "❌ У вас нет активной подписки";
  }

  const now = new Date();
  if (subscription.endDate < now) {
    return "❌ Ваша подписка истекла";
  }

  const endDate = subscription.endDate.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `✅ Ваша подписка активна до ${endDate}`;
}
