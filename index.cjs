const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Telegraf, Markup, session } = require("telegraf");
require("dotenv").config();
const axios = require("axios");
const dgram = require("dgram");

const app = express();
const PORT = process.env.PORT || 3030;
const NOTES_FILE = "./notes-data.json";
const BOT_TOKEN = process.env.BOT_TOKEN;
const NOTES_API = process.env.NOTES_API || `http://localhost:${PORT}`;

// MAC-адрес вашего домашнего компьютера
const TARGET_MAC = "60:A4:4C:61:1C:79";

if (!BOT_TOKEN) {
  console.error("❌ Необходимо указать BOT_TOKEN в .env");
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Wake-on-LAN функция
function wakeOnLan(macAddress) {
  const client = dgram.createSocket("udp4");

  const mac = macAddress.replace(/:/g, "").toLowerCase();
  const magicPacket = Buffer.alloc(102);

  for (let i = 0; i < 6; i++) {
    magicPacket[i] = 0xff;
  }

  for (let i = 1; i <= 16; i++) {
    for (let j = 0; j < 6; j++) {
      magicPacket[i * 6 + j] = parseInt(mac.substr(j * 2, 2), 16);
    }
  }

  client.send(
    magicPacket,
    0,
    magicPacket.length,
    9,
    "255.255.255.255",
    (err) => {
      if (err) {
        console.log("Ошибка отправки Wake-on-LAN пакета:", err);
      } else {
        console.log("Wake-on-LAN пакет отправлен для MAC:", macAddress);
      }
      client.close();
    }
  );
}

// Express middleware
app.use(cors());
app.use(bodyParser.json());

// Загружаем заметки из файла
function loadNotes() {
  if (!fs.existsSync(NOTES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(NOTES_FILE, "utf-8"));
  } catch {
    return {};
  }
}

// Сохраняем заметки в файл
function saveNotes(data) {
  fs.writeFileSync(NOTES_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// API endpoints
app.get("/notes", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const notes = loadNotes();
  res.json(notes[userId] || []);
});

app.post("/notes", (req, res) => {
  const { userId, title, content } = req.body;
  if (!userId || !title)
    return res.status(400).json({ error: "userId and title required" });
  const notes = loadNotes();
  const newNote = {
    id: String(Date.now()),
    title,
    content: content || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  notes[userId] = notes[userId] || [];
  notes[userId].unshift(newNote);
  saveNotes(notes);
  res.json(newNote);
});

app.put("/notes/:id", (req, res) => {
  const { userId, title, content } = req.body;
  const noteId = req.params.id;
  if (!userId || !noteId)
    return res.status(400).json({ error: "userId and noteId required" });
  const notes = loadNotes();
  const userNotes = notes[userId] || [];
  const note = userNotes.find((n) => n.id === noteId);
  if (!note) return res.status(404).json({ error: "Note not found" });
  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  note.updatedAt = new Date().toISOString();
  saveNotes(notes);
  res.json(note);
});

app.delete("/notes/:id", (req, res) => {
  const userId = req.query.userId;
  const noteId = req.params.id;
  if (!userId || !noteId)
    return res.status(400).json({ error: "userId and noteId required" });
  const notes = loadNotes();
  notes[userId] = (notes[userId] || []).filter((n) => n.id !== noteId);
  saveNotes(notes);
  res.json({ success: true });
});

// Bot functions
async function fetchNotes(userId) {
  const res = await axios.get(`${NOTES_API}/notes`, { params: { userId } });
  return res.data;
}

async function createNote(userId, title, content) {
  const res = await axios.post(`${NOTES_API}/notes`, {
    userId,
    title,
    content,
  });
  return res.data;
}

async function updateNote(userId, id, title, content) {
  const res = await axios.put(`${NOTES_API}/notes/${id}`, {
    userId,
    title,
    content,
  });
  return res.data;
}

async function deleteNote(userId, id) {
  await axios.delete(`${NOTES_API}/notes/${id}`, { params: { userId } });
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

// Power management commands
bot.command("power", async (ctx) => {
  await ctx.reply(
    "🔌 Управление питанием компьютера:",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🟢 Включить", "power_on"),
        Markup.button.callback("🔴 Выключить", "power_off"),
      ],
      [Markup.button.callback("🔄 Перезагрузить", "power_restart")],
    ])
  );
});

// Power management actions
bot.action("power_on", async (ctx) => {
  await ctx.answerCbQuery("Отправляю команду включения...");
  wakeOnLan(TARGET_MAC);
  await ctx.reply("✅ Команда включения отправлена на компьютер!");
});

bot.action("power_off", async (ctx) => {
  await ctx.answerCbQuery("Команда выключения будет выполнена через заметку");
  await ctx.reply(
    "📝 Создайте заметку с заголовком 'windows' и текстом 'выключить' для выключения компьютера."
  );
});

bot.action("power_restart", async (ctx) => {
  await ctx.answerCbQuery("Команда перезагрузки будет выполнена через заметку");
  await ctx.reply(
    "📝 Создайте заметку с заголовком 'windows' и текстом 'перезагрузить' для перезагрузки компьютера."
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
  await deleteNote(ctx.from.id, noteId);
  await ctx.answerCbQuery("Заметка удалена");
  await ctx.deleteMessage();
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
      await createNote(ctx.from.id, ctx.session.newTitle, ctx.message.text);
      ctx.session.creating = false;
      ctx.session.newTitle = null;
      await ctx.reply("Заметка создана!");
      return;
    }
  }

  if (ctx.session.editing) {
    const note = notes.find((n) => n.id === ctx.session.editing);
    if (note) {
      await updateNote(ctx.from.id, note.id, note.title, ctx.message.text);
      await ctx.reply("Заметка обновлена!");
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
    "👋 Привет! Я бот для заметок и управления питанием компьютера.",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("📝 Мои заметки", "show_notes"),
        Markup.button.callback("🔌 Управление питанием", "power_menu"),
      ],
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
    Markup.button.callback("🔌 Управление питанием", "power_menu"),
  ]);
  await ctx.reply(
    notes.length ? "Ваши заметки:" : "У вас пока нет заметок.",
    Markup.inlineKeyboard(buttons)
  );
});

bot.action("power_menu", async (ctx) => {
  await ctx.reply(
    "🔌 Управление питанием компьютера:",
    Markup.inlineKeyboard([
      [
        Markup.button.callback("🟢 Включить", "power_on"),
        Markup.button.callback("🔴 Выключить", "power_off"),
      ],
      [Markup.button.callback("🔄 Перезагрузить", "power_restart")],
    ])
  );
});

// Start both server and bot
app.listen(PORT, () => {
  console.log(`🗒️ Notes API server running on http://localhost:${PORT}`);
});

bot.launch().then(() => {
  console.log("🤖 Бот для заметок запущен!");
  console.log("🔌 Управление питанием доступно через команду /power");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
