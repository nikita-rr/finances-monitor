import { startBot } from './lib/telegram';

// Start bot on server startup
if (process.env.NODE_ENV !== 'development' || process.env.START_BOT === 'true') {
  startBot().catch(console.error);
}

export {};
