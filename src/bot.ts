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
import { privateGroupId } from "./config/groups";
import { getSubscription } from "./subscriptions";
import { PrismaClient } from "@prisma/client";

// Загружаем переменные окружения
dotenv.config();

// Создаем экземпляр бота
const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error("BOT_TOKEN не найден в .env файле");
}

export const bot = new TelegramBot(token, { polling: true });

const prisma = new PrismaClient();

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
    case "start":
      // Отправляем главное меню
      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            {
              text: "🔍 Проверить подписку",
              callback_data: "check_subscription",
            },
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

      await bot.sendMessage(chatId, subscriptionInfo, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      break;
    case "get_invite":
      const subscription = await getSubscription(userId);

      if (!subscription || subscription.endDate < new Date()) {
        await bot.sendMessage(
          chatId,
          "❌ У вас нет активной подписки. Пожалуйста, приобретите подписку для доступа к приватной группе."
        );
        break;
      }

      if (!privateGroupId) {
        await bot.sendMessage(
          chatId,
          "❌ Ошибка конфигурации: ID приватной группы не указан."
        );
        break;
      }

      try {
        // Создаем пригласительную ссылку
        const inviteLink = await bot.createChatInviteLink(privateGroupId, {
          member_limit: 1,
          expire_date: Math.floor(Date.now() / 1000) + 3600, // Ссылка действительна 1 час
        });

        await bot.sendMessage(
          chatId,
          `🔗 Вот ваша пригласительная ссылка в приватную группу:\n\n${inviteLink.invite_link}\n\n⚠️ Ссылка действительна 1 час и может быть использована только один раз.`
        );
      } catch (error) {
        console.error("Ошибка при создании пригласительной ссылки:", error);
        await bot.sendMessage(
          chatId,
          "❌ Произошла ошибка при создании пригласительной ссылки. Пожалуйста, попробуйте позже."
        );
      }
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
          yookassaId: payment.id,
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
          `💎 ${product.name} за ${Math.floor(
            product.price
          )}₽\n\nНажмите на кнопку ниже для оплаты:`,
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

// Функция для удаления пользователей с истекшей подпиской
async function removeExpiredSubscriptions() {
  if (!privateGroupId) {
    console.error("ID приватной группы не указан");
    return;
  }

  try {
    const now = new Date();
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        endDate: {
          lte: now,
        },
      },
    });

    for (const subscription of expiredSubscriptions) {
      try {
        // Удаляем пользователя из группы
        await bot.banChatMember(privateGroupId, subscription.userId);
        // Удаляем запись о подписке
        await prisma.subscription.delete({
          where: { userId: subscription.userId },
        });
        console.log(
          `Пользователь ${subscription.userId} удален из группы из-за истекшей подписки`
        );
      } catch (error) {
        console.error(
          `Ошибка при удалении пользователя ${subscription.userId}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Ошибка при проверке подписок:", error);
  }
}

// Функция для отправки уведомлений о скором окончании подписки
async function sendSubscriptionExpiryNotifications() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        endDate: {
          gte: new Date(),
          lte: tomorrow,
        },
      },
    });

    for (const subscription of expiringSubscriptions) {
      try {
        const keyboard: InlineKeyboardMarkup = {
          inline_keyboard: [
            [{ text: "🔄 Продлить подписку", callback_data: "start" }],
          ],
        };

        await bot.sendMessage(
          subscription.userId,
          "⚠️ Ваша подписка заканчивается завтра! Нажмите на кнопку ниже, чтобы продлить подписку.",
          { reply_markup: keyboard }
        );
      } catch (error) {
        console.error(
          `Ошибка при отправке уведомления пользователю ${subscription.userId}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error("Ошибка при отправке уведомлений:", error);
  }
}

// Запускаем проверку подписок каждый день в полночь
function scheduleDailyChecks() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);

  const timeUntilMidnight = midnight.getTime() - now.getTime();

  // Запускаем первую проверку через время до полуночи
  setTimeout(() => {
    removeExpiredSubscriptions();
    sendSubscriptionExpiryNotifications();

    // Затем запускаем проверку каждые 24 часа
    setInterval(() => {
      removeExpiredSubscriptions();
      sendSubscriptionExpiryNotifications();
    }, 24 * 60 * 60 * 1000);
  }, timeUntilMidnight);
}

// Запускаем планировщик при старте бота
scheduleDailyChecks();

// Функция для проверки прав администратора
async function isAdmin(chatId: string, userId: number): Promise<boolean> {
  try {
    const chatMember = await bot.getChatMember(chatId, userId);
    return ["creator", "administrator"].includes(chatMember.status);
  } catch (error) {
    console.error(
      `Ошибка при проверке прав администратора для пользователя ${userId}:`,
      error
    );
    return false;
  }
}

// Обработчик события вступления нового участника
bot.on("new_chat_members", async (msg) => {
  if (
    !privateGroupId ||
    msg.chat.id.toString() !== privateGroupId ||
    !msg.new_chat_members
  ) {
    return; // Игнорируем события из других чатов или если нет новых участников
  }

  for (const newMember of msg.new_chat_members) {
    try {
      // Проверяем, является ли пользователь администратором
      const isUserAdmin = await isAdmin(privateGroupId, newMember.id);
      if (isUserAdmin) {
        console.log(
          `Пользователь ${newMember.id} является администратором, пропускаем проверку подписки`
        );
        continue;
      }

      // Проверяем наличие активной подписки
      const subscription = await getSubscription(newMember.id);
      const now = new Date();

      if (!subscription || subscription.endDate < now) {
        // Удаляем пользователя из группы
        await bot.banChatMember(privateGroupId, newMember.id);
        console.log(
          `Пользователь ${newMember.id} удален из группы из-за отсутствия активной подписки`
        );

        // Отправляем сообщение пользователю
        try {
          await bot.sendMessage(
            newMember.id,
            "❌ Вы были удалены из приватной группы, так как у вас нет активной подписки.\n\n" +
              "Для доступа к группе необходимо приобрести подписку. Нажмите /start для выбора тарифа."
          );
        } catch (error) {
          console.error(
            `Ошибка при отправке сообщения пользователю ${newMember.id}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error(
        `Ошибка при обработке нового участника ${newMember.id}:`,
        error
      );
    }
  }
});
