import dotenv from "dotenv";
import TelegramBot, {
  InlineKeyboardMarkup,
  Message,
  CallbackQuery,
} from "node-telegram-bot-api";
import { checkSubscriptionStatus } from "./subscriptions";
import { checkout, subscriptionProducts } from "./config/yookassa";
import { createPayment } from "./payments";
import { SubscriptionType } from "./types/product";

// Загружаем переменные окружения
dotenv.config();

// Создаем экземпляр бота
const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN не найден в .env файле");
}

export const bot = new TelegramBot(token, { polling: true });

// Обработчик команды /start
bot.onText(/^\/start(@\w+)?$/, (msg: Message) => {
  const chatId = msg.chat.id;
  const keyboard: InlineKeyboardMarkup = {
    inline_keyboard: [
      [
        { text: "🔍 Проверить подписку", callback_data: "check_subscription" },
        { text: "🔗 Получить приглашение", callback_data: "get_invite" },
      ],
      [
        { text: "1 месяц - 100₽", callback_data: "sub_1_month" },
        { text: "3 месяца - 250₽", callback_data: "sub_3_month" },
      ],
      [
        { text: "6 месяцев - 450₽", callback_data: "sub_6_month" },
        { text: "12 месяцев - 800₽", callback_data: "sub_12_month" },
      ],
    ],
  };

  const subscriptionInfo = `
🎯 <b>Приватная подписка</b>

✨ <b>Преимущества подписки:</b>
• Доступ к эксклюзивному контенту
• Чат с админами
• Голосование за новую вайфу

💎 <b>Выберите подходящий тариф:</b>
• 1 месяц - 100₽
• 3 месяца - 250₽ (экономия 50₽)
• 6 месяцев - 450₽ (экономия 150₽)
• 12 месяцев - 800₽ (экономия 400₽)
  `;

  bot.sendMessage(chatId, subscriptionInfo, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });
});

// Обработчик нажатий на кнопки
bot.on("callback_query", async (query: CallbackQuery) => {
  if (!query.message || !query.data) return;

  const chatId = query.message.chat.id;
  const data = query.data;
  const userId = query.from.id;

  switch (data) {
    case "check_subscription":
      const status = await checkSubscriptionStatus(userId);
      await bot.sendMessage(chatId, status);
      break;
    case "get_invite":
      await bot.sendMessage(
        chatId,
        "🔗 Генерируем приглашение в приватную группу..."
      );
      break;
    case "sub_1_month":
    case "sub_3_month":
    case "sub_6_month":
    case "sub_12_month":
      const subscriptionType = data as SubscriptionType;
      const product = subscriptionProducts[subscriptionType];

      if (!product) {
        console.error(
          `Продукт не найден для типа подписки: ${subscriptionType}`
        );
        await bot.sendMessage(chatId, "❌ Произошла ошибка: продукт не найден");
        break;
      }

      if (product.price <= 0) {
        console.error(`Некорректная цена для продукта: ${product.name}`);
        await bot.sendMessage(
          chatId,
          "❌ Произошла ошибка: некорректная цена продукта"
        );
        break;
      }

      if (product.duration <= 0) {
        console.error(
          `Некорректная длительность для продукта: ${product.name}`
        );
        await bot.sendMessage(
          chatId,
          "❌ Произошла ошибка: некорректная длительность подписки"
        );
        break;
      }

      try {
        const payment = await checkout.createPayment({
          amount: {
            value: product.price.toString(),
            currency: "RUB",
          },
          confirmation: {
            type: "redirect",
            return_url: `https://t.me/${process.env.BOT_USERNAME}`,
          },
          metadata: {
            userId: userId.toString(),
            duration: product.duration.toString(),
            productName: product.name,
          },
          description: product.name,
        });

        // Сохраняем информацию о платеже в базе данных
        await createPayment({
          userId,
          amount: product.price,
          productName: product.name,
        });

        const keyboard: InlineKeyboardMarkup = {
          inline_keyboard: [
            [
              {
                text: "💳 Оплатить",
                url: payment.confirmation.confirmation_url,
              },
            ],
          ],
        };

        await bot.sendMessage(
          chatId,
          `💎 ${product.name} за ${
            product.price / 100
          }₽\n\nНажмите на кнопку ниже для оплаты:`,
          { reply_markup: keyboard }
        );
      } catch (error) {
        console.error("Ошибка при создании платежа:", error);
        await bot.sendMessage(
          chatId,
          "❌ Произошла ошибка при создании платежа. Попробуйте позже."
        );
      }
      break;
  }

  await bot.answerCallbackQuery(query.id);
});

// Обработка ошибок
bot.on("polling_error", (error: Error) => {
  console.error("Ошибка при опросе:", error);
});

console.log("Бот запущен...");
