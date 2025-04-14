import express from "express";
import { bot } from "./bot";
import { updatePaymentStatus, deletePayment, capturePayment } from "./payments";
import { setSubscription } from "./subscriptions";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/webhook", (_, res) => {
  res.send("Hello World");
});

app.post("/webhook", async (req, res) => {
  try {
    const { object } = req.body;

    if (object.status === "waiting_for_capture") {
      // Подтверждаем платеж
      const captured = await capturePayment(object.id);

      if (!captured) {
        console.error(`Не удалось подтвердить платеж ${object.id}`);
        return res.sendStatus(200);
      }

      const { metadata } = object;
      const userId = parseInt(metadata.userId);
      const duration = parseInt(metadata.duration);

      // Обновляем статус платежа
      const updatedPayment = await updatePaymentStatus(object.id, "succeeded");

      if (!updatedPayment) {
        console.error(`Платеж с ID ${object.id} не найден в базе данных`);
        return res.sendStatus(200);
      }

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

      // Удаляем запись о платеже
      await deletePayment(object.id);
    } else if (object.status === "canceled") {
      // Обновляем статус платежа
      await updatePaymentStatus(object.id, "canceled");
      // Удаляем запись о платеже
      await deletePayment(object.id);
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
