import { Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { bot } from './bot';
import { budgetStorage } from './storage';
import { formatBudgetMessage, parseTransactions } from './utils';

// Command: /start
bot.command('start', (ctx) => {
  ctx.reply(
    'Добро пожаловать в бота отслеживания бюджета! 💰\n\n' +
    'Команды:\n' +
    '/setbudget <сумма> [дни]- Установить месячный бюджет\n' +
    '/status - Показать текущий статус бюджета\n' +
    '/help - Справка по использованию'
  );
});

// Command: /help
bot.command('help', (ctx) => {
  ctx.reply(
    '*Справка по боту*\n\n' +
    '📋 *Команды:*\n' +
    '/setbudget <сумма> [дни] - Установить бюджет на период\n' +
    '  Пример: /setbudget 30000 - на 30 дней\n' +
    '  Пример: /setbudget 15000 14 - на 14 дней\n' +
    '/status - Показать текущий статус\n' +
    '/reset - Сбросить все траты (период продолжается)\n' +
    '/pin - Закрепить сообщение со статусом\n\n' +
    '💳 *Как добавить расходы/доходы:*\n' +
    'Просто напишите в чат:\n' +
    '-300 обед\n' +
    '-200 такси\n' +
    '+500 зарплата\n\n' +
    'Или несколько за раз:\n' +
    '-300 обед -200 сигареты +100 возврат\n\n' +
    'Можно и без описания:\n' +
    '-500',
    { parse_mode: 'Markdown' }
  );
});

// Command: /setbudget
bot.command('setbudget', async (ctx) => {
  const args = ctx.message?.text.split(' ');
  const amount = parseFloat(args?.[1] || '');
  const period = args?.[2] ? parseInt(args[2]) : 30;

  if (isNaN(amount) || amount <= 0) {
    ctx.reply('❌ Пожалуйста, укажите корректную сумму бюджета\nПример: /setbudget 30000\nИли с периодом: /setbudget 30000 14');
    return;
  }

  if (isNaN(period) || period <= 0 || period > 365) {
    ctx.reply('❌ Пожалуйста, укажите корректный период (от 1 до 365 дней)\nПример: /setbudget 30000 14');
    return;
  }

  const budget = budgetStorage.initBudget(amount, period);
  ctx.reply(
    `✅ Общий бюджет установлен на *${amount.toFixed(2)} руб.* на *${period} дней*\n` +
    `📅 Дневной лимит: *${(amount / period).toFixed(2)} руб.*`,
    { parse_mode: 'Markdown' }
  );

  // Automatically pin the status message
  try {
    const message = formatBudgetMessage(budget);
    const sentMessage = await ctx.reply(message, { parse_mode: 'Markdown' });

    if (ctx.chat?.type === 'supergroup' || ctx.chat?.type === 'group') {
      await ctx.pinChatMessage(sentMessage.message_id);
    }

    budgetStorage.updatePinnedMessageId(sentMessage.message_id, ctx.chat?.id);
  } catch (error) {
    console.error('Error pinning message:', error);
  }
});

// Command: /status
bot.command('status', (ctx) => {
  const budget = budgetStorage.getBudget();
  if (!budget) {
    ctx.reply('❌ Бюджет не установлен. Используйте /setbudget <сумма>');
    return;
  }

  const message = formatBudgetMessage(budget);
  ctx.reply(message, { parse_mode: 'Markdown' });
});

// Command: /pin
bot.command('pin', async (ctx) => {
  const budget = budgetStorage.getBudget();
  if (!budget) {
    ctx.reply('❌ Бюджет не установлен. Используйте /setbudget <сумма>');
    return;
  }

  try {
    const message = formatBudgetMessage(budget);
    const sentMessage = await ctx.reply(message, { parse_mode: 'Markdown' });

    if (ctx.chat?.type === 'supergroup' || ctx.chat?.type === 'group') {
      await ctx.pinChatMessage(sentMessage.message_id);
    }

    budgetStorage.updatePinnedMessageId(sentMessage.message_id, ctx.chat?.id);
    ctx.reply('✅ Сообщение со статусом закреплено!');
  } catch (error) {
    console.error('Error pinning message:', error);
    ctx.reply('❌ Ошибка при закреплении сообщения');
  }
});

// Command: /reset
bot.command('reset', async (ctx) => {
  const budget = budgetStorage.getBudget();
  if (!budget) {
    ctx.reply('❌ Бюджет не установлен');
    return;
  }

  const period = budget.period || 30;
  const transactionsCount = budgetStorage.resetTransactions();
  
  ctx.reply(
    `✅ Траты сброшены!\n\n` +
    `💰 Бюджет: *${budget.monthlyBudget.toFixed(2)} руб.* на *${period} дней*\n` +
    `🗑 Удалено транзакций: *${transactionsCount}*\n` +
    `📅 Период продолжается`,
    { parse_mode: 'Markdown' }
  );

  updatePinnedMessage(ctx);
});

// Handle all text messages for transaction parsing
bot.on(message('text'), async (ctx) => {
  const text = ctx.message.text;

  // Skip if it's a command
  if (text.startsWith('/')) {
    return;
  }

  const budget = budgetStorage.getBudget();
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
  const budget = budgetStorage.getBudget();
  if (!budget || !budget.pinnedMessageId) {
    return;
  }

  try {
    const message = formatBudgetMessage(budget);
    await ctx.telegram.editMessageText(
      ctx.chat?.id || 0,
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
