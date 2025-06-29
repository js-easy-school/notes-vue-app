require("dotenv").config();
const { Telegraf } = require("telegraf");

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

if (!BOT_TOKEN || !WEBAPP_URL) {
  console.error("❌ Необходимо указать BOT_TOKEN и WEBAPP_URL в .env");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// /start — приветствие и кнопка запуска WebApp
bot.start((ctx) => {
  ctx.reply(
    "👋 Привет! Это современное приложение заметок. Открой WebApp для работы с заметками.",
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "📝 Открыть заметки",
              web_app: { url: WEBAPP_URL },
            },
          ],
        ],
      },
    }
  );
});

// /notes — быстрая кнопка запуска WebApp
bot.command("notes", (ctx) => {
  ctx.reply("Открываю приложение заметок…", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📝 Открыть заметки",
            web_app: { url: WEBAPP_URL },
          },
        ],
      ],
    },
  });
});

// Обработка данных от WebApp (если потребуется)
bot.on("web_app_data", (ctx) => {
  const data = ctx.message.web_app_data.data;
  console.log("Получены данные от WebApp:", data);
  ctx.reply("Данные получены! 📝");
});

// Обработка ошибок
bot.catch((err, ctx) => {
  console.error(`Ошибка для ${ctx.updateType}:`, err);
});

// Запуск бота
bot
  .launch()
  .then(() => {
    console.log("🤖 Бот запущен!");
    console.log("🔗 WebApp URL:", WEBAPP_URL);
    console.log("📱 Отправьте /start или /notes в боте для запуска WebApp");
  })
  .catch((err) => {
    console.error("Ошибка запуска бота:", err);
  });

// Graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
