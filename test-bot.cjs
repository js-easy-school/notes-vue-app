const { Telegraf, Markup, session } = require("telegraf");
require("dotenv").config();
const axios = require("axios");

// Используйте другой токен для тестирования
const BOT_TOKEN = process.env.TEST_BOT_TOKEN || "YOUR_TEST_BOT_TOKEN";
const NOTES_API = process.env.NOTES_API || "http://localhost:3030";

if (!BOT_TOKEN || BOT_TOKEN === "YOUR_TEST_BOT_TOKEN") {
  console.error(
    "❌ Создайте нового бота на @BotFather и укажите TEST_BOT_TOKEN в .env"
  );
  console.log("📝 Инструкция:");
  console.log("1. Напишите @BotFather в Telegram");
  console.log("2. Отправьте /newbot");
  console.log("3. Следуйте инструкциям");
  console.log("4. Скопируйте токен в .env файл как TEST_BOT_TOKEN");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Bot functions
async function fetchNotes(userId) {
  try {
    const res = await axios.get(`${NOTES_API}/notes`, { params: { userId } });
    return res.data;
  } catch (error) {
    console.error("Ошибка получения заметок:", error.message);
    return [];
  }
}

async function createNote(userId, title, content) {
  try {
    const res = await axios.post(`${NOTES_API}/notes`, {
      userId,
      title,
      content,
    });
    return res.data;
  } catch (error) {
    console.error("Ошибка создания заметки:", error.message);
    throw error;
  }
}

async function updateNote(userId, id, title, content) {
  try {
    const res = await axios.put(`${NOTES_API}/notes/${id}`, {
      userId,
      title,
      content,
    });
    return res.data;
  } catch (error) {
    console.error("Ошибка обновления заметки:", error.message);
    throw error;
  }
}

async function deleteNote(userId, id) {
  try {
    await axios.delete(`${NOTES_API}/notes/${id}`, { params: { userId } });
  } catch (error) {
    console.error("Ошибка удаления заметки:", error.message);
    throw error;
  }
}

// Bot middleware
bot.use(session());

// Bot commands
bot.command("notes", async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.searchMode = false;
  const notes = await fetchNotes(ctx.from.id);
  const buttons = [];
  if (notes.length > 0) {
    for (const note of notes) {
      buttons.push([
        Markup.button.callback(`📝 ${note.title}`, `open_${note.id}`),
        Markup.button.callback("❌", `delete_${note.id}`),
      ]);
    }
  }
  buttons.push([
    Markup.button.callback("➕ Создать новую", "create_note"),
    Markup.button.callback("🔍 Поиск", "search_notes"),
  ]);
  await ctx.reply(
    notes.length ? "Ваши заметки:" : "У вас пока нет заметок.",
    Markup.inlineKeyboard(buttons)
  );
});

// Bot actions
bot.action("search_notes", async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.searchMode = true;
  await ctx.reply("Введите поисковый запрос:");
});

bot.action("create_note", async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.creating = true;
  ctx.session.newTitle = null;
  await ctx.reply("Введите заголовок новой заметки:");
});

bot.action(/open_(.+)/, async (ctx) => {
  ctx.session = ctx.session || {};
  const noteId = ctx.match[1];
  const notes = await fetchNotes(ctx.from.id);
  const note = notes.find((n) => n.id === noteId);
  if (!note) return ctx.answerCbQuery("Заметка не найдена");
  await ctx.replyWithMarkdown(
    `*${note.title}*
${note.content || "_(пусто)_"}`,
    Markup.inlineKeyboard([
      [Markup.button.callback("✏️ Редактировать", `edit_${note.id}`)],
    ])
  );
});

bot.action(/delete_(.+)/, async (ctx) => {
  ctx.session = ctx.session || {};
  const noteId = ctx.match[1];
  try {
    await deleteNote(ctx.from.id, noteId);
    await ctx.answerCbQuery("Заметка удалена");
    await ctx.deleteMessage();
  } catch (error) {
    await ctx.answerCbQuery("Ошибка удаления заметки");
  }
});

bot.action(/edit_(.+)/, async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.editing = ctx.match[1];
  await ctx.reply("Введите новый текст заметки:");
});

// Text message handling
bot.on("text", async (ctx) => {
  ctx.session = ctx.session || {};
  const notes = await fetchNotes(ctx.from.id);

  if (ctx.session.creating) {
    if (!ctx.session.newTitle) {
      ctx.session.newTitle = ctx.message.text;
      await ctx.reply("Теперь введите текст заметки:");
      return;
    } else {
      try {
        await createNote(ctx.from.id, ctx.session.newTitle, ctx.message.text);
        ctx.session.creating = false;
        ctx.session.newTitle = null;
        await ctx.reply("Заметка создана!");
      } catch (error) {
        await ctx.reply("Ошибка создания заметки");
      }
      return;
    }
  }

  if (ctx.session.editing) {
    const note = notes.find((n) => n.id === ctx.session.editing);
    if (note) {
      try {
        await updateNote(ctx.from.id, note.id, note.title, ctx.message.text);
        await ctx.reply("Заметка обновлена!");
      } catch (error) {
        await ctx.reply("Ошибка обновления заметки");
      }
    }
    ctx.session.editing = null;
    return;
  }

  if (ctx.session.searchMode) {
    const query = ctx.message.text.trim();
    ctx.session.searchMode = false;
    if (!query) {
      await ctx.reply("Пустой запрос. Попробуйте ещё раз.");
      return;
    }
    const results = notes.filter(
      (n) =>
        n.title.toLowerCase().includes(query.toLowerCase()) ||
        n.content.toLowerCase().includes(query.toLowerCase())
    );
    if (results.length === 0) {
      await ctx.reply("Ничего не найдено.");
      return;
    }
    for (const note of results) {
      await ctx.replyWithMarkdown(
        `*${note.title}*\n${note.content.slice(0, 100)}${
          note.content.length > 100 ? "…" : ""
        }`,
        Markup.inlineKeyboard([
          [Markup.button.callback("Открыть", `open_${note.id}`)],
        ])
      );
    }
    return;
  }
});

bot.action("show_notes", async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.searchMode = false;
  const notes = await fetchNotes(ctx.from.id);
  const buttons = [];
  if (notes.length > 0) {
    for (const note of notes) {
      buttons.push([
        Markup.button.callback(`📝 ${note.title}`, `open_${note.id}`),
        Markup.button.callback("❌", `delete_${note.id}`),
      ]);
    }
  }
  buttons.push([
    Markup.button.callback("➕ Создать новую", "create_note"),
    Markup.button.callback("🔍 Поиск", "search_notes"),
  ]);
  await ctx.reply(
    notes.length ? "Ваши заметки:" : "У вас пока нет заметок.",
    Markup.inlineKeyboard(buttons)
  );
});

bot.command("search", async (ctx) => {
  ctx.session = ctx.session || {};
  const query = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!query) {
    await ctx.reply("Введите запрос для поиска, например: /search важное");
    return;
  }
  const notes = await fetchNotes(ctx.from.id);
  const results = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.content.toLowerCase().includes(query.toLowerCase())
  );
  if (results.length === 0) {
    await ctx.reply("Ничего не найдено.");
    return;
  }
  for (const note of results) {
    await ctx.replyWithMarkdown(
      `*${note.title}*\n${note.content.slice(0, 100)}${
        note.content.length > 100 ? "…" : ""
      }`,
      Markup.inlineKeyboard([
        [Markup.button.callback("Открыть", `open_${note.id}`)],
      ])
    );
  }
});

bot.start(async (ctx) => {
  ctx.session = ctx.session || {};
  await ctx.reply(
    "👋 Привет! Я тестовый бот для заметок.",
    Markup.inlineKeyboard([
      [Markup.button.callback("📝 Мои заметки", "show_notes")],
    ])
  );

  const notes = await fetchNotes(ctx.from.id);
  const buttons = [];
  if (notes.length > 0) {
    for (const note of notes) {
      buttons.push([
        Markup.button.callback(`📝 ${note.title}`, `open_${note.id}`),
        Markup.button.callback("❌", `delete_${note.id}`),
      ]);
    }
  }
  buttons.push([
    Markup.button.callback("➕ Создать новую", "create_note"),
    Markup.button.callback("🔍 Поиск", "search_notes"),
  ]);
  await ctx.reply(
    notes.length ? "Ваши заметки:" : "У вас пока нет заметок.",
    Markup.inlineKeyboard(buttons)
  );
});

// Запуск бота
bot.launch().then(() => {
  console.log("🤖 Тестовый бот для заметок запущен!");
  console.log("📝 Используйте этого бота для локального тестирования");
  console.log("🔗 Ссылка на бота:", `https://t.me/${bot.botInfo?.username}`);
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
