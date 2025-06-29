<script setup>
import { ref, computed, watch } from "vue";
import NoteList from "./components/NoteList.vue";
import NoteEditor from "./components/NoteEditor.vue";

function loadNotes() {
  const raw = localStorage.getItem("notes-vue-app");
  if (!raw) return [];
  try {
    return JSON.parse(raw).map((n) => ({
      ...n,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt),
    }));
  } catch {
    return [];
  }
}
function saveNotes(notes) {
  localStorage.setItem("notes-vue-app", JSON.stringify(notes));
}

const notes = ref(loadNotes());
const selectedNoteId = ref(notes.value[0]?.id || null);
const searchQuery = ref("");

watch(notes, (val) => saveNotes(val), { deep: true });

const filteredNotes = computed(() =>
  notes.value.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
);

const selectedNote = computed(() =>
  notes.value.find((note) => note.id === selectedNoteId.value)
);

function handleNoteCreate() {
  const newNote = {
    id: crypto.randomUUID(),
    title: "Новая заметка",
    content: "",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  notes.value = [newNote, ...notes.value];
  selectedNoteId.value = newNote.id;
}
function handleNoteSelect(noteId) {
  selectedNoteId.value = noteId;
}
function handleNoteDelete(noteId) {
  notes.value = notes.value.filter((note) => note.id !== noteId);
  if (selectedNoteId.value === noteId) {
    selectedNoteId.value = notes.value[0]?.id || null;
  }
}
function handleNoteUpdate({ title, content }) {
  notes.value = notes.value.map((note) =>
    note.id === selectedNoteId.value
      ? { ...note, title, content, updatedAt: new Date() }
      : note
  );
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>📝 Заметки</h1>
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск заметок..."
          class="search-input"
        />
      </div>
    </header>
    <div class="container">
      <aside class="sidebar">
        <div class="sidebar-header">
          <button @click="handleNoteCreate" class="create-btn">
            ➕ Новая заметка
          </button>
        </div>
        <NoteList
          :notes="filteredNotes"
          :selectedNoteId="selectedNoteId"
          @select="handleNoteSelect"
          @delete="handleNoteDelete"
        />
      </aside>
      <main class="content">
        <template v-if="selectedNoteId">
          <NoteEditor
            v-if="selectedNote"
            :note="selectedNote"
            @update="handleNoteUpdate"
          />
        </template>
        <template v-else>
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h2>Добро пожаловать в приложение заметок!</h2>
            <p>Создайте свою первую заметку, нажав кнопку "Новая заметка"</p>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #181a20;
}
.header {
  background: #1f2128;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #23242b;
}
.header h1 {
  color: #fff;
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.search-container {
  position: relative;
}
.search-input {
  background: #23242b;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  color: #e0e0e0;
  font-size: 0.95rem;
  width: 220px;
  transition: background 0.2s;
}
.search-input::placeholder {
  color: #555a6a;
}
.search-input:focus {
  outline: 2px solid #35384a;
  background: #23242b;
}
.container {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.sidebar {
  width: 270px;
  background: #191a1f;
  border-right: 1px solid #23242b;
  display: flex;
  flex-direction: column;
}
.sidebar-header {
  padding: 1rem;
  border-bottom: 1px solid #23242b;
}
.create-btn {
  width: 100%;
  background: #23242b;
  border: none;
  border-radius: 6px;
  padding: 0.7rem;
  color: #e0e0e0;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  font-weight: 500;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04);
}
.create-btn:hover {
  background: #26272d;
  color: #fff;
}
.content {
  flex: 1;
  background: #181a20;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888ca0;
  text-align: center;
  padding: 2rem;
}
.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.7;
}
@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
  .search-input {
    width: 100%;
  }
  .container {
    flex-direction: column;
    height: 100%;
  }
  .sidebar {
    width: 100%;
    height: auto;
    min-height: 180px;
    border-right: none;
    border-bottom: 1px solid #23242b;
  }
  .content {
    flex: 1;
    min-height: 0;
    max-height: 100vh;
    overflow-y: auto;
    padding-bottom: 80px;
  }
}
@media (max-width: 480px) {
  .header {
    padding: 0.5rem;
  }
  .sidebar-header {
    padding: 0.5rem;
  }
  .create-btn {
    padding: 0.5rem;
    font-size: 1rem;
  }
  .empty-state {
    padding: 1rem;
  }
}
</style>
