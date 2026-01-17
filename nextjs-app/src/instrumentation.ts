import { startBot } from './lib/telegram';

export async function register() {
  // Start bot on server startup (only in Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('Starting Telegram bot...');
    await startBot();
  }
}
