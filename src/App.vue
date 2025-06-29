<script setup>
import { ref, computed, watch, onMounted } from "vue";
import NoteList from "./components/NoteList.vue";
import NoteEditor from "./components/NoteEditor.vue";
import { getTelegramWebApp, getTelegramUser } from "./telegram";
import { getNotes, createNote, updateNote, deleteNote } from "./api";

const notes = ref([]);
const selectedNoteId = ref(null);
const searchQuery = ref("");
const isLoading = ref(false);

const isTelegram = ref(false);
const tgUser = ref(null);

async function loadNotesAndSelectFirst() {
  isLoading.value = true;
  notes.value = await getNotes();
  selectedNoteId.value = notes.value[0]?.id || null;
  isLoading.value = false;
}

onMounted(async () => {
  const tg = getTelegramWebApp();
  if (tg) {
    isTelegram.value = true;
    tg.expand();
    tgUser.value = getTelegramUser();
  }
  await loadNotesAndSelectFirst();
});

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

async function handleNoteCreate() {
  const newNote = await createNote("Новая заметка", "");
  await loadNotesAndSelectFirst();
  selectedNoteId.value = newNote.id;
}
async function handleNoteSelect(noteId) {
  selectedNoteId.value = noteId;
}
async function handleNoteDelete(noteId) {
  await deleteNote(noteId);
  await loadNotesAndSelectFirst();
}
async function handleNoteUpdate({ title, content }) {
  if (!selectedNoteId.value) return;
  await updateNote(selectedNoteId.value, title, content);
  await loadNotesAndSelectFirst();
  selectedNoteId.value =
    notes.value.find((n) => n.id === selectedNoteId.value)?.id ||
    notes.value[0]?.id ||
    null;
}
</script>

<template>
  <div class="app">
    <div v-if="isTelegram" class="tg-bar">
      <span v-if="tgUser" class="tg-user"
        >👤 {{ tgUser.first_name }} {{ tgUser.last_name }}</span
      >
      <button class="tg-close" @click="getTelegramWebApp()?.close()">
        Закрыть
      </button>
    </div>
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
.tg-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1.5rem;
  background: #23242b;
  padding: 0.5rem 1.5rem 0.5rem 1.5rem;
  border-bottom: 1px solid #23242b;
}
.tg-user {
  color: #aaa;
  font-size: 0.95rem;
}
.tg-close {
  background: #23242b;
  color: #e57373;
  border: none;
  border-radius: 6px;
  padding: 0.4rem 1.1rem;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.18s;
}
.tg-close:hover {
  background: #292b33;
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
