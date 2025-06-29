<template>
  <div class="note-editor">
    <header class="editor-header">
      <div class="note-info">
        <span class="note-id">ID: {{ note.id.slice(0, 8) }}...</span>
        <span class="note-date"
          >Обновлено: {{ formatDate(note.updatedAt) }}</span
        >
      </div>
    </header>
    <div class="editor-content">
      <div class="title-section">
        <input
          ref="titleInput"
          v-model="localTitle"
          @input="emitUpdate"
          @focus="scrollToField('titleInput')"
          class="title-input"
          placeholder="Заголовок заметки..."
          maxlength="100"
        />
      </div>
      <div class="content-section">
        <textarea
          ref="contentTextarea"
          v-model="localContent"
          @input="emitUpdate"
          @focus="scrollToField('contentTextarea')"
          class="content-textarea"
          placeholder="Начните писать вашу заметку..."
          rows="10"
        ></textarea>
      </div>
    </div>
    <div class="editor-footer">
      <div class="stats">
        <span class="char-count">Символов: {{ localContent.length }}</span>
        <span class="word-count">Слов: {{ wordCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
const props = defineProps({ note: Object });
const emit = defineEmits(["update"]);

const localTitle = ref(props.note.title);
const localContent = ref(props.note.content);
const titleInput = ref();
const contentTextarea = ref();

watch(
  () => props.note,
  (newNote) => {
    localTitle.value = newNote.title;
    localContent.value = newNote.content;
  }
);

function emitUpdate() {
  emit("update", {
    title: localTitle.value,
    content: localContent.value,
  });
}
function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
const wordCount = computed(() =>
  localContent.value.trim() ? localContent.value.trim().split(/\s+/).length : 0
);

function scrollToField(refName) {
  if (window.innerWidth <= 768) {
    setTimeout(() => {
      if (refName === "titleInput" && titleInput.value) {
        titleInput.value.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      } else if (refName === "contentTextarea" && contentTextarea.value) {
        contentTextarea.value.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
  }
}

onMounted(() => {
  // Автофокус на заголовок при создании новой заметки
  if (props.note.title === "Новая заметка" && props.note.content === "") {
    setTimeout(() => {
      titleInput.value?.focus();
    }, 100);
  }
});
</script>

<style scoped>
.note-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #23242b;
  border-radius: 10px;
  margin: 1rem;
  box-shadow: none;
  overflow: auto;
  min-height: 0;
}
.editor-header {
  background: #23242b;
  padding: 1rem 1rem 0.5rem 1rem;
  border-bottom: 1px solid #23242b;
}
.note-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: #555a6a;
}
.note-id {
  font-family: "Courier New", monospace;
  background: #181a20;
  padding: 0.18rem 0.5rem;
  border-radius: 4px;
}
.note-date {
  color: #555a6a;
}
.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  overflow: auto;
  min-height: 0;
}
.title-section {
  margin-bottom: 1rem;
}
.title-input {
  width: 100%;
  font-size: 1.2rem;
  font-weight: 500;
  border: none;
  outline: none;
  background: transparent;
  color: #e0e0e0;
  padding: 0.4rem 0;
  border-bottom: 1.5px solid #35384a;
  transition: border-color 0.2s;
}
.title-input:focus {
  border-bottom-color: #888ca0;
}
.title-input::placeholder {
  color: #555a6a;
}
.content-section {
  flex: 1;
  overflow: auto;
  min-height: 0;
}
.content-textarea {
  width: 100%;
  height: 100%;
  min-height: 120px;
  border: none;
  outline: none;
  background: transparent;
  color: #e0e0e0;
  font-size: 1rem;
  line-height: 1.6;
  resize: none;
  font-family: inherit;
}
.content-textarea::placeholder {
  color: #555a6a;
}
.editor-footer {
  background: #23242b;
  padding: 0.5rem 1rem;
  border-top: 1px solid #23242b;
}
.stats {
  display: flex;
  justify-content: flex-end;
  font-size: 0.8rem;
  color: #555a6a;
  gap: 1.2rem;
}
.char-count,
.word-count {
  background: #181a20;
  padding: 0.18rem 0.5rem;
  border-radius: 4px;
}
@media (max-width: 768px) {
  .note-editor {
    margin: 0.5rem 0.5rem 0.5rem 0.5rem;
    border-radius: 8px;
    min-height: 0;
  }
  .editor-header {
    padding: 0.75rem 0.75rem 0.5rem 0.75rem;
  }
  .editor-content {
    padding: 0.75rem;
  }
  .title-input {
    font-size: 1rem;
  }
  .note-info {
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
  }
  .content-textarea {
    min-height: 80px;
    font-size: 1.05rem;
  }
}
@media (max-width: 480px) {
  .note-editor {
    margin: 0.2rem 0.2rem 0.2rem 0.2rem;
  }
  .editor-content {
    padding: 0.5rem;
  }
  .title-input {
    font-size: 0.98rem;
  }
  .content-textarea {
    font-size: 1rem;
  }
}
</style>
