const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const PORT = 3030;
const NOTES_FILE = "./notes-data.json";

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

// Получить все заметки пользователя
app.get("/notes", (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const notes = loadNotes();
  res.json(notes[userId] || []);
});

// Создать новую заметку
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

// Обновить заметку
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

// Удалить заметку
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

app.listen(PORT, () => {
  console.log(`🗒️ Notes API server running on http://localhost:${PORT}`);
});
