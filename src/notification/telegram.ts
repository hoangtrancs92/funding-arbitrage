import TelegramBot from 'node-telegram-bot-api'
import 'dotenv/config' 

// Dùng biến môi trường trong .env
const TOKEN = process.env.TELEGRAM_BOT_TOKEN as string
const CHAT_ID = process.env.TELEGRAM_CHAT_ID as string
console.log('🚀 Telegram Chat ID:', CHAT_ID)
// Khởi tạo bot (polling: false vì ta chỉ gửi message)
const bot = new TelegramBot(TOKEN, { polling: false })

/**
 * Gửi tin nhắn Telegram
 * @param message Nội dung tin nhắn muốn gửi
 */
export async function sendTelegramMessage(message: string): Promise<void> {
  try {
    await bot.sendMessage(CHAT_ID, message)
    console.log('✅ Đã gửi message đến Telegram:', message)
  } catch (error) {
    console.error('❌ Lỗi khi gửi message Telegram:', error)
  }
}