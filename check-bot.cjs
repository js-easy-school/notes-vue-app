const axios = require("axios");

const BOT_TOKEN =
  process.env.BOT_TOKEN || "7638357741:AAEPNwwE6cIFXS0_E1ygzAWSrpCIn8MZE9s";

async function checkBotStatus() {
  try {
    console.log("🔍 Проверяю статус бота...");

    // Получаем информацию о боте
    const botInfo = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
    );
    console.log("✅ Бот найден:", botInfo.data.result.username);

    // Удаляем webhook если есть
    const deleteWebhook = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`
    );
    console.log("✅ Webhook удален:", deleteWebhook.data.result);

    // Получаем информацию о webhook
    const webhookInfo = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );
    console.log("📋 Информация о webhook:", webhookInfo.data.result);

    if (webhookInfo.data.result.url) {
      console.log("⚠️ Webhook все еще активен:", webhookInfo.data.result.url);
    } else {
      console.log("✅ Webhook не активен, можно запускать polling");
    }
  } catch (error) {
    console.error("❌ Ошибка при проверке бота:", error.message);
    if (error.response) {
      console.error("Ответ сервера:", error.response.data);
    }
  }
}

checkBotStatus();
