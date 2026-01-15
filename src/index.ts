import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import dotenv from 'dotenv';
import { budgetStorage } from './storage';
import { formatBudgetMessage, parseTransactions } from './utils';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN not found in environment variables');
}

const bot = new Telegraf(token);

// Command: /start
bot.command('start', (ctx) => {
  ctx.reply(
    'Добро пожаловать в бота отслеживания бюджета! 💰\n\n' +
    'Команды:\n' +
    '/setbudget <сумма> - Установить месячный бюджет\n' +
    '/status - Показать текущий статус бюджета\n' +
    '/help - Справка по использованию'
  );
});

// Command: /help
bot.command('help', (ctx) => {
  ctx.reply(
    '*Справка по боту*\n\n' +
    '📋 *Команды:*\n' +
    '/setbudget <сумма> - Установить месячный бюджет на месяц\n' +
    '/status - Показать текущий статус\n' +
    '/reset - Сбросить бюджет (админ)\n' +
    '/pin - Закрепить сообщение со статусом\n\n' +
    '💳 *Как добавить расходы/доходы:*\n' +
    'Просто напишите в чат:\n' +
    '-300 обед\n' +
    '-200 такси\n' +
    '+500 зарплата\n\n' +
    'Или несколько за раз:\n' +
    '-300 обед -200 сигареты +100 возврат',
    { parse_mode: 'Markdown' }
  );
});

// Command: /setbudget
bot.command('setbudget', async (ctx) => {
  if (!ctx.chat) {
    ctx.reply('❌ Ошибка: не удалось определить чат');
    return;
  }

  const args = ctx.message?.text.split(' ');
  const amount = parseFloat(args?.[1] || '');

  if (isNaN(amount) || amount <= 0) {
    ctx.reply('❌ Пожалуйста, укажите корректную сумму бюджета\nПример: /setbudget 30000');
    return;
  }

  const budget = budgetStorage.initBudget(ctx.chat.id, amount);
  ctx.reply(
    `✅ Месячный бюджет установлен на *${amount.toFixed(2)} руб.*\n` +
    `📅 Дневной лимит: *${(amount / 30).toFixed(2)} руб.*`,
    { parse_mode: 'Markdown' }
  );

  // Automatically pin the status message
  try {
    const message = formatBudgetMessage(budget);
    const sentMessage = await ctx.reply(message, { parse_mode: 'Markdown' });

    await ctx.pinChatMessage(sentMessage.message_id);

    budgetStorage.updatePinnedMessageId(ctx.chat.id, sentMessage.message_id);
  } catch (error) {
    console.error('Error pinning message:', error);
  }
});

// Command: /status
bot.command('status', (ctx) => {
  if (!ctx.chat) {
    ctx.reply('❌ Ошибка: не удалось определить чат');
    return;
  }

  const budget = budgetStorage.getBudget(ctx.chat.id);
  if (!budget) {
    ctx.reply('❌ Бюджет не установлен. Используйте /setbudget <сумма>');
    return;
  }

  const message = formatBudgetMessage(budget);
  ctx.reply(message, { parse_mode: 'Markdown' });
});

// Command: /pin
bot.command('pin', async (ctx) => {
  if (!ctx.chat) {
    ctx.reply('❌ Ошибка: не удалось определить чат');
    return;
  }

  const budget = budgetStorage.getBudget(ctx.chat.id);
  if (!budget) {
    ctx.reply('❌ Бюджет не установлен. Используйте /setbudget <сумма>');
    return;
  }

  try {
    const message = formatBudgetMessage(budget);
    const sentMessage = await ctx.reply(message, { parse_mode: 'Markdown' });

    await ctx.pinChatMessage(sentMessage.message_id);

    budgetStorage.updatePinnedMessageId(ctx.chat.id, sentMessage.message_id);
    ctx.reply('✅ Сообщение со статусом закреплено!');
  } catch (error) {
    console.error('Error pinning message:', error);
    ctx.reply('❌ Ошибка при закреплении сообщения');
  }
});

// Command: /reset
bot.command('reset', async (ctx) => {
  if (!ctx.chat) {
    ctx.reply('❌ Ошибка: не удалось определить чат');
    return;
  }

  const budget = budgetStorage.getBudget(ctx.chat.id);
  if (!budget) {
    ctx.reply('❌ Бюджет не установлен');
    return;
  }

  budgetStorage.initBudget(ctx.chat.id, budget.monthlyBudget);
  ctx.reply(
    `✅ Бюджет сброшен. Новый месячный период начинается с суммы *${budget.monthlyBudget.toFixed(2)} руб.*`,
    { parse_mode: 'Markdown' }
  );

  updatePinnedMessage(ctx);
});

// Handle all text messages for transaction parsing
bot.on(message('text'), async (ctx) => {
  if (!ctx.chat) {
    return;
  }

  const text = ctx.message.text;

  // Skip if it's a command
  if (text.startsWith('/')) {
    return;
  }

  const budget = budgetStorage.getBudget(ctx.chat.id);
  if (!budget) {
    ctx.reply('❌ Бюджет не установлен. Используйте /setbudget <сумма>');
    return;
  }

  const transactions = parseTransactions(text);
  if (transactions.length === 0) {
    return;
  }

  let addedMessage = '';
  for (const transaction of transactions) {
    budgetStorage.addTransaction(
      ctx.chat.id,
      transaction.amount,
      transaction.description,
      ctx.from?.id || 0,
      ctx.from?.first_name || 'Аноним'
    );

    const sign = transaction.amount > 0 ? '➕' : '➖';
    addedMessage += `${sign} ${Math.abs(transaction.amount).toFixed(2)} - ${transaction.description}\n`;
  }

  if (addedMessage) {
    ctx.reply(`✅ Транзакции добавлены:\n${addedMessage}`);
    updatePinnedMessage(ctx);
  }
});

async function updatePinnedMessage(ctx: Context): Promise<void> {
  if (!ctx.chat) {
    return;
  }

  const budget = budgetStorage.getBudget(ctx.chat.id);
  if (!budget || !budget.pinnedMessageId) {
    return;
  }

  try {
    const message = formatBudgetMessage(budget);
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      budget.pinnedMessageId,
      undefined,
      message,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error updating pinned message:', error);
  }
}

// Start the bot
bot.launch();

console.log('🤖 Бот запущен успешно!');

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
