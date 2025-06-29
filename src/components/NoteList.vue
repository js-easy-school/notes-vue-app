<template>
  <div class="note-list">
    <div v-if="notes.length === 0" class="empty-list">
      <p>Нет заметок</p>
      <p class="hint">Создайте первую заметку!</p>
    </div>
    <div
      v-for="note in notes"
      :key="note.id"
      :class="['note-item', { selected: selectedNoteId === note.id }]"
      @click="$emit('select', note.id)"
      tabindex="0"
      role="button"
      aria-label="Выбрать заметку: {{ note.title }}"
    >
      <div class="note-header">
        <h3 class="note-title">{{ note.title }}</h3>
        <button
          class="delete-btn"
          @click.stop="$emit('delete', note.id)"
          title="Удалить заметку"
          aria-label="Удалить заметку: {{ note.title }}"
        >
          🗑️
        </button>
      </div>
      <p class="note-preview">{{ truncateText(note.content) }}</p>
      <div class="note-meta">
        <span class="note-date">{{ formatDate(note.updatedAt) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
const props = defineProps({
  notes: Array,
  selectedNoteId: String,
});
const emit = defineEmits(["select", "delete"]);

function truncateText(text, maxLength = 50) {
  if (!text) return "";
  return text.length <= maxLength ? text : text.substring(0, maxLength) + "...";
}
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Сегодня";
  if (days === 1) return "Вчера";
  if (days < 7) return `${days} дн. назад`;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}
</script>

<style scoped>
.note-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}
.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 180px;
  color: #555a6a;
  text-align: center;
}
.empty-list p {
  margin: 0.25rem 0;
}
.hint {
  font-size: 0.8rem;
  opacity: 0.6;
}
.note-item {
  background: #23242b;
  border: none;
  border-radius: 8px;
  padding: 0.9rem 1rem;
  margin-bottom: 0.7rem;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s;
  position: relative;
  display: flex;
  flex-direction: column;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.04);
}
.note-item:hover {
  background: #282a36;
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.08);
}
.note-item.selected {
  background: #292b33;
  box-shadow: 0 0 0 2px #3a3d4d;
}
.note-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.3rem;
}
.note-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #e0e0e0;
  flex: 1;
  line-height: 1.3;
}
.delete-btn {
  background: none;
  border: none;
  color: #555a6a;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  font-size: 0.95rem;
  transition: background 0.2s, color 0.2s;
  opacity: 0;
}
.note-item:hover .delete-btn {
  opacity: 1;
}
.delete-btn:hover {
  background: #23242b;
  color: #e57373;
}
.note-preview {
  margin: 0 0 0.3rem 0;
  color: #888ca0;
  font-size: 0.85rem;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 2;
}
.note-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.note-date {
  font-size: 0.75rem;
  color: #555a6a;
}
</style>
