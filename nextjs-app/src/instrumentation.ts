export async function register() {
  // Start bot on server startup (only in Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('Starting Telegram bot...');
    const { startBot } = await import('./lib/telegram');
    await startBot();
  }
}
