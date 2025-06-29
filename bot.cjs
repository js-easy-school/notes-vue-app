const { Telegraf, Markup, session } = require("telegraf");
require("dotenv").config();
const axios = require("axios");

const BOT_TOKEN = process.env.BOT_TOKEN;
const NOTES_API = process.env.NOTES_API || "http://localhost:3030";
if (!BOT_TOKEN) {
  console.error("❌ Необходимо указать BOT_TOKEN в .env");
  process.exit(1);
}
const bot = new Telegraf(BOT_TOKEN);

// Подключаем session middleware
bot.use(session());

// Получить заметки пользователя
async function fetchNotes(userId) {
  const res = await axios.get(`${NOTES_API}/notes`, { params: { userId } });
  return res.data;
}

// Создать заметку
async function createNote(userId, title, content) {
  const res = await axios.post(`${NOTES_API}/notes`, {
    userId,
    title,
    content,
  });
  return res.data;
}

// Обновить заметку
async function updateNote(userId, id, title, content) {
  const res = await axios.put(`${NOTES_API}/notes/${id}`, {
    userId,
    title,
    content,
  });
  return res.data;
}

// Удалить заметку
async function deleteNote(userId, id) {
  await axios.delete(`${NOTES_API}/notes/${id}`, { params: { userId } });
}

// Команда /notes — показать список заметок
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

// Кнопка "Поиск" — переводим в режим поиска
bot.action("search_notes", async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.searchMode = true;
  await ctx.reply("Введите поисковый запрос:");
});

// Обработка создания новой заметки
bot.action("create_note", async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.creating = true;
  ctx.session.newTitle = null;
  await ctx.reply("Введите заголовок новой заметки:");
});

// Обработка открытия заметки
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

// Обработка удаления заметки
bot.action(/delete_(.+)/, async (ctx) => {
  ctx.session = ctx.session || {};
  const noteId = ctx.match[1];
  await deleteNote(ctx.from.id, noteId);
  await ctx.answerCbQuery("Заметка удалена");
  await ctx.deleteMessage();
});

// Обработка редактирования заметки
bot.action(/edit_(.+)/, async (ctx) => {
  ctx.session = ctx.session || {};
  ctx.session.editing = ctx.match[1];
  await ctx.reply("Введите новый текст заметки:");
});

// Обработка текстовых сообщений (создание/редактирование/поиск)
bot.on("text", async (ctx) => {
  ctx.session = ctx.session || {};
  const notes = await fetchNotes(ctx.from.id);
  if (ctx.session.creating) {
    // Сначала ждём заголовок, потом текст
    if (!ctx.session.newTitle) {
      ctx.session.newTitle = ctx.message.text;
      await ctx.reply("Теперь введите текст заметки:");
      return;
    } else {
      await createNote(ctx.from.id, ctx.session.newTitle, ctx.message.text);
      ctx.session.creating = false;
      ctx.session.newTitle = null;
      await ctx.reply("Заметка создана!");
      await ctx.reply(
        "Что дальше?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("🔍 Поиск", "search_notes"),
            Markup.button.callback("📋 Все заметки", "show_notes"),
          ],
        ])
      );
      return;
    }
  }
  if (ctx.session.editing) {
    const note = notes.find((n) => n.id === ctx.session.editing);
    if (note) {
      await updateNote(ctx.from.id, note.id, note.title, ctx.message.text);
      await ctx.reply("Заметка обновлена!");
      await ctx.reply(
        "Что дальше?",
        Markup.inlineKeyboard([
          [
            Markup.button.callback("🔍 Поиск", "search_notes"),
            Markup.button.callback("📋 Все заметки", "show_notes"),
          ],
        ])
      );
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

// Кнопка "Все заметки" возвращает к списку
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

// Поиск заметок по команде /search <запрос>
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

// /start — приветствие
bot.start((ctx) => {
  ctx.session = ctx.session || {};
  ctx.reply(
    "👋 Привет! Я бот для заметок. Используйте /notes для работы с заметками."
  );
});

bot.launch().then(() => {
  console.log("🤖 Бот для заметок запущен!");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
