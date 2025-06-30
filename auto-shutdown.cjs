const fs = require("fs");
const { exec } = require("child_process");
const dgram = require("dgram");

const NOTES_FILE = "./notes-data.json";
const USER_ID = "298878378"; // твой Telegram userId
const STATE_FILE = "./shutdown-state.json"; // файл для хранения состояния

// MAC-адрес сетевой карты компьютера (нужно заменить на реальный)
const TARGET_MAC = "60:A4:4C:61:1C:79"; // MAC-адрес Realtek PCIe GBE Family Controller

// Функция для отправки Wake-on-LAN пакета
function wakeOnLan(macAddress) {
  const client = dgram.createSocket("udp4");

  // Создаем магический пакет
  const mac = macAddress.replace(/:/g, "").toLowerCase();
  const magicPacket = Buffer.alloc(102);

  // Заполняем первые 6 байт 0xFF
  for (let i = 0; i < 6; i++) {
    magicPacket[i] = 0xff;
  }

  // Повторяем MAC-адрес 16 раз
  for (let i = 1; i <= 16; i++) {
    for (let j = 0; j < 6; j++) {
      magicPacket[i * 6 + j] = parseInt(mac.substr(j * 2, 2), 16);
    }
  }

  // Отправляем пакет
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

// Загружаем состояние последней обработанной заметки
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    } catch (error) {
      console.log("Ошибка чтения состояния, начинаем с начала");
    }
  }
  return { lastProcessedNoteId: null };
}

// Сохраняем состояние
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function checkForShutdownNote() {
  if (!fs.existsSync(NOTES_FILE)) return;

  const data = JSON.parse(fs.readFileSync(NOTES_FILE, "utf-8"));
  const notes = data[USER_ID] || [];
  if (notes.length === 0) return;

  const state = loadState();
  const lastNote = notes[0]; // первая в массиве — самая новая

  // Если это первый запуск (нет сохраненного состояния), просто запоминаем текущую заметку
  if (state.lastProcessedNoteId === null) {
    console.log("Первый запуск: запоминаю текущую заметку как обработанную");
    state.lastProcessedNoteId = lastNote.id;
    saveState(state);
    return; // Не выполняем команды при первом запуске
  }

  // Проверяем, не обрабатывали ли мы уже эту заметку
  if (state.lastProcessedNoteId === lastNote.id) {
    return; // Эта заметка уже была обработана
  }

  const title = lastNote.title.toLowerCase();
  const content = lastNote.content.toLowerCase();

  // Проверяем команду выключения
  if (title.includes("windows") && content.includes("выключить")) {
    console.log(
      "Обнаружена новая команда на выключение! Выключаю компьютер..."
    );
    state.lastProcessedNoteId = lastNote.id;
    saveState(state);
    exec("C:\\Windows\\System32\\shutdown.exe /s /t 0");
  }
  // Проверяем команду включения
  else if (title.includes("windows") && content.includes("включить")) {
    console.log("Обнаружена новая команда на включение! Включаю компьютер...");
    state.lastProcessedNoteId = lastNote.id;
    saveState(state);
    wakeOnLan(TARGET_MAC);
  }
  // Проверяем команду перезагрузки
  else if (title.includes("windows") && content.includes("перезагрузить")) {
    console.log(
      "Обнаружена новая команда на перезагрузку! Перезагружаю компьютер..."
    );
    state.lastProcessedNoteId = lastNote.id;
    saveState(state);
    exec("C:\\Windows\\System32\\shutdown.exe /r /t 0");
  } else {
    console.log("Новая заметка не содержит команды управления питанием.");
    state.lastProcessedNoteId = lastNote.id;
    saveState(state);
  }
}

// Проверять каждые 10 секунд
setInterval(checkForShutdownNote, 10000);

console.log("Мониторинг новых заметок для управления питанием запущен...");
console.log("Поддерживаемые команды:");
console.log("- 'windows' + 'выключить' - выключить компьютер");
console.log("- 'windows' + 'включить' - включить компьютер (Wake-on-LAN)");
console.log("- 'windows' + 'перезагрузить' - перезагрузить компьютер");
console.log(
  "ВАЖНО: Для включения компьютера настройте Wake-on-LAN в BIOS и замените MAC-адрес!"
);
