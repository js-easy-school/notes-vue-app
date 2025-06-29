import axios from "axios";

const API_URL = "http://localhost:3030";

function getUserId() {
  // Если есть Telegram WebApp, берём userId из него
  if (
    window.Telegram &&
    window.Telegram.WebApp &&
    window.Telegram.WebApp.initDataUnsafe &&
    window.Telegram.WebApp.initDataUnsafe.user
  ) {
    return window.Telegram.WebApp.initDataUnsafe.user.id;
  }
  // Иначе берём из localStorage (или генерируем)
  let userId = localStorage.getItem("notes-user-id");
  if (!userId) {
    userId = String(Math.floor(Math.random() * 1e12));
    localStorage.setItem("notes-user-id", userId);
  }
  return userId;
}

export async function getNotes() {
  const userId = getUserId();
  const res = await axios.get(`${API_URL}/notes`, { params: { userId } });
  return res.data;
}

export async function createNote(title, content) {
  const userId = getUserId();
  const res = await axios.post(`${API_URL}/notes`, { userId, title, content });
  return res.data;
}

export async function updateNote(id, title, content) {
  const userId = getUserId();
  const res = await axios.put(`${API_URL}/notes/${id}`, {
    userId,
    title,
    content,
  });
  return res.data;
}

export async function deleteNote(id) {
  const userId = getUserId();
  await axios.delete(`${API_URL}/notes/${id}`, { params: { userId } });
}
