import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { updatePaymentStatus } from "./payments";
import { setSubscription } from "./subscriptions";

const app = express();
const port = process.env.PORT || 3000;
const bot = new TelegramBot(process.env.BOT_TOKEN!, { polling: false });

app.use(express.json());

app.post("/webhook", async (req, res) => {
  try {
    const { object } = req.body;

    if (object.status === "succeeded") {
      const { metadata } = object;
      const userId = parseInt(metadata.userId);
      const duration = parseInt(metadata.duration);

      // Обновляем статус платежа
      await updatePaymentStatus(object.id, "succeeded");

      // Продлеваем подписку
      await setSubscription(userId, duration);

      // Отправляем уведомление пользователю
      await bot.sendMessage(
        userId,
        `✅ Оплата прошла успешно! Ваша подписка продлена на ${duration} ${
          duration === 1 ? "месяц" : "месяца"
        }`
      );

      console.log(
        `Пользователь ${userId} успешно оплатил подписку на ${duration} месяцев`
      );
    } else if (object.status === "canceled") {
      // Обновляем статус платежа
      await updatePaymentStatus(object.id, "canceled");
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Ошибка при обработке webhook:", error);
    res.sendStatus(500);
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});
