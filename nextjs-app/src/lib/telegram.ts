import { Telegraf, Context } from 'telegraf';
import { Budget, BudgetCalculations } from '@/types';
import { 
  getBudget, 
  createBudget, 
  addTransaction, 
  deleteBudget, 
  updateBudget,
  deleteTransaction,
  getLastTransactions
} from './storage';
import { calculateBudgetStats, formatCurrency } from './calculations';

let bot: Telegraf | null = null;

export function initBot(): Telegraf | null {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.error('BOT_TOKEN is not set');
    return null;
  }

  if (bot) {
    return bot;
  }

  bot = new Telegraf(token);
  setupCommands(bot);
  
  return bot;
}

export function getBot(): Telegraf | null {
  return bot;
}

function setupCommands(bot: Telegraf) {
  // /start - показать приветствие и справку
  bot.command('start', async (ctx) => {
    const webAppUrl = process.env.WEBAPP_URL || 'https://your-domain.com';
    await ctx.reply(
      '💰 *Бюджет-трекер*\n\n' +
      'Добро пожаловать! Это приложение для учета расходов.\n\n' +
      '*Команды:*\n' +
      '/budget <сумма> [дни] - Создать бюджет\n' +
      '/status - Показать статус бюджета\n' +
      '/expense <сумма> [описание] - Добавить расход\n' +
      '/income <сумма> [описание] - Добавить доход\n' +
      '/transactions - Последние транзакции\n' +
      '/delete - Удалить бюджет\n' +
      '/undo - Отменить последнюю транзакцию\n\n' +
      `🌐 [Открыть приложение](${webAppUrl})`,
      { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 Открыть приложение', web_app: { url: webAppUrl } }
          ]]
        }
      }
    );
  });

  // /budget <amount> [days] - создать бюджет
  bot.command('budget', async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1);
    
    if (args.length === 0) {
      await ctx.reply('❌ Укажите сумму бюджета: /budget <сумма> [дни]\nПример: /budget 50000 14');
      return;
    }

    const amount = parseFloat(args[0]);
    const days = parseInt(args[1]) || 14;

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('❌ Неверная сумма. Укажите положительное число.');
      return;
    }

    if (days <= 0 || days > 365) {
      await ctx.reply('❌ Период должен быть от 1 до 365 дней.');
      return;
    }

    const existingBudget = getBudget();
    if (existingBudget) {
      await ctx.reply(
        '⚠️ Уже есть активный бюджет. Удалите его командой /delete перед созданием нового.'
      );
      return;
    }

    const budget = createBudget(amount, days, ctx.chat.id);
    const stats = calculateBudgetStats(budget);
    
    const message = await ctx.reply(generateBudgetMessage(budget, stats), {
      parse_mode: 'Markdown'
    });

    // Сохраняем ID сообщения для обновления
    budget.telegramMessageId = message.message_id;
    updateBudget(budget);

    await ctx.reply(
      `✅ Бюджет создан!\n` +
      `💰 Сумма: ${formatCurrency(amount)}\n` +
      `📅 Период: ${days} дней\n` +
      `📊 Дневной лимит: ${formatCurrency(amount / days)}`
    );
  });

  // /status - показать статус
  bot.command('status', async (ctx) => {
    const budget = getBudget();
    if (!budget) {
      await ctx.reply('❌ Бюджет не установлен. Создайте его командой /budget <сумма> [дни]');
      return;
    }

    const stats = calculateBudgetStats(budget);
    await ctx.reply(generateBudgetMessage(budget, stats), { parse_mode: 'Markdown' });
  });

  // /expense <amount> [description] - добавить расход
  bot.command('expense', async (ctx) => {
    await handleTransaction(ctx, 'expense');
  });

  // Короткая команда для расхода
  bot.command('e', async (ctx) => {
    await handleTransaction(ctx, 'expense');
  });

  // /income <amount> [description] - добавить доход
  bot.command('income', async (ctx) => {
    await handleTransaction(ctx, 'income');
  });

  // Короткая команда для дохода
  bot.command('i', async (ctx) => {
    await handleTransaction(ctx, 'income');
  });

  // /transactions - показать последние транзакции
  bot.command('transactions', async (ctx) => {
    const budget = getBudget();
    if (!budget) {
      await ctx.reply('❌ Бюджет не установлен.');
      return;
    }

    const transactions = getLastTransactions(10);
    if (transactions.length === 0) {
      await ctx.reply('📝 Транзакций пока нет.');
      return;
    }

    let message = '📝 *Последние транзакции:*\n\n';
    transactions.forEach((t, index) => {
      const date = new Date(t.date);
      const sign = t.amount < 0 ? '➖' : '➕';
      const amount = Math.abs(t.amount).toFixed(2);
      message += `${index + 1}. ${sign} ${amount} ₽ - ${t.description}\n`;
      message += `   📅 ${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  // /delete - удалить бюджет
  bot.command('delete', async (ctx) => {
    const budget = getBudget();
    if (!budget) {
      await ctx.reply('❌ Нет активного бюджета для удаления.');
      return;
    }

    deleteBudget();
    await ctx.reply('🗑️ Бюджет удален.');
  });

  // /undo - отменить последнюю транзакцию
  bot.command('undo', async (ctx) => {
    const budget = getBudget();
    if (!budget || budget.transactions.length === 0) {
      await ctx.reply('❌ Нет транзакций для отмены.');
      return;
    }

    const lastTransaction = budget.transactions[budget.transactions.length - 1];
    deleteTransaction(lastTransaction.id);
    
    const sign = lastTransaction.amount < 0 ? '-' : '+';
    await ctx.reply(
      `↩️ Отменена транзакция:\n` +
      `${sign}${Math.abs(lastTransaction.amount).toFixed(2)} ₽ - ${lastTransaction.description}`
    );

    await updateBudgetMessage(ctx);
  });

  // Обработка текстовых сообщений с быстрым вводом
  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    
    // Быстрый ввод расхода: просто число или "-число"
    const expenseMatch = text.match(/^-?(\d+(?:\.\d+)?)\s*(.*)$/);
    if (expenseMatch) {
      const amount = parseFloat(expenseMatch[1]);
      const description = expenseMatch[2].trim() || 'Быстрый расход';
      
      const budget = getBudget();
      if (!budget) {
        return; // Игнорируем если нет бюджета
      }

      // Если начинается с минуса или просто число - это расход
      const isExpense = text.startsWith('-') || !text.startsWith('+');
      const finalAmount = isExpense ? -amount : amount;
      
      const transaction = addTransaction(
        finalAmount,
        description,
        ctx.from?.id,
        ctx.from?.first_name
      );

      if (transaction) {
        const sign = finalAmount < 0 ? '➖' : '➕';
        await ctx.reply(`${sign} ${Math.abs(finalAmount).toFixed(2)} ₽ - ${description}`);
        await updateBudgetMessage(ctx);
      }
    }
  });
}

async function handleTransaction(ctx: Context, type: 'expense' | 'income') {
  if (!ctx.message || !('text' in ctx.message)) return;
  
  const args = ctx.message.text.split(' ').slice(1);
  
  if (args.length === 0) {
    await ctx.reply(`❌ Укажите сумму: /${type} <сумма> [описание]`);
    return;
  }

  const amount = parseFloat(args[0]);
  const description = args.slice(1).join(' ') || (type === 'expense' ? 'Расход' : 'Доход');

  if (isNaN(amount) || amount <= 0) {
    await ctx.reply('❌ Неверная сумма. Укажите положительное число.');
    return;
  }

  const budget = getBudget();
  if (!budget) {
    await ctx.reply('❌ Бюджет не установлен. Создайте его командой /budget <сумма> [дни]');
    return;
  }

  const finalAmount = type === 'expense' ? -amount : amount;
  const transaction = addTransaction(
    finalAmount,
    description,
    ctx.from?.id,
    ctx.from?.first_name
  );

  if (transaction) {
    const emoji = type === 'expense' ? '➖' : '➕';
    await ctx.reply(`${emoji} ${amount.toFixed(2)} ₽ - ${description}`);
    await updateBudgetMessage(ctx);
  }
}

function generateBudgetMessage(budget: Budget, stats: BudgetCalculations): string {
  let message = '📊 *Статус бюджета*\n\n';
  
  message += `📅 Период: ${stats.currentDay}/${stats.periodDays} день\n`;
  message += `💰 Бюджет: ${formatCurrency(stats.totalBudget)}\n`;
  message += `✅ Остаток: ${formatCurrency(stats.remaining)}\n\n`;
  
  message += `📉 Плановый дневной: ${formatCurrency(stats.plannedDailyBudget)}\n`;
  
  message += `💸 Расходы за период: ${formatCurrency(stats.totalSpent)}\n`;
  message += `💵 Доходы за период: ${formatCurrency(stats.totalIncome)}\n\n`;
  
  message += `📅 *Сегодня:*\n`;
  message += `   Расходы: ${formatCurrency(stats.todayExpenses)}\n`;
  message += `   Баланс: ${stats.todayBalance >= 0 ? '+' : ''}${formatCurrency(stats.todayBalance)}\n\n`;

  // Предупреждения и информация
  if (stats.overspendToday > 0) {
    message += `⚠️ Перерасход сегодня: ${formatCurrency(stats.overspendToday)}\n`;
  }

  if (stats.dailyBudgetChange !== 0 && stats.remainingDays > 1) {
    if (stats.dailyBudgetChange < 0) {
      message += `📉 Завтра лимит уменьшится на: ${formatCurrency(Math.abs(stats.dailyBudgetChange))}\n`;
      message += `   (будет ${formatCurrency(stats.tomorrowDailyBudget)})\n`;
    } else {
      message += `📈 Завтра лимит увеличится на: ${formatCurrency(stats.dailyBudgetChange)}\n`;
      message += `   (будет ${formatCurrency(stats.tomorrowDailyBudget)})\n`;
    }
  }

  if (stats.saved > 0) {
    message += `💎 Сэкономлено: ${formatCurrency(stats.saved)}\n`;
  } else if (stats.saved < 0) {
    message += `⚠️ Перерасход: ${formatCurrency(Math.abs(stats.saved))}\n`;
  }

  return message;
}

async function updateBudgetMessage(ctx: Context) {
  const budget = getBudget();
  if (!budget || !budget.telegramMessageId || !budget.telegramChatId) {
    return;
  }

  const stats = calculateBudgetStats(budget);
  const message = generateBudgetMessage(budget, stats);

  try {
    await ctx.telegram.editMessageText(
      budget.telegramChatId,
      budget.telegramMessageId,
      undefined,
      message,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error updating budget message:', error);
  }
}

export async function notifyBudgetUpdate(): Promise<void> {
  const budget = getBudget();
  if (!budget || !budget.telegramMessageId || !budget.telegramChatId || !bot) {
    return;
  }

  const stats = calculateBudgetStats(budget);
  const message = generateBudgetMessage(budget, stats);

  try {
    await bot.telegram.editMessageText(
      budget.telegramChatId,
      budget.telegramMessageId,
      undefined,
      message,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error notifying budget update:', error);
  }
}

export async function startBot(): Promise<void> {
  const telegrafBot = initBot();
  if (!telegrafBot) {
    console.error('Failed to initialize bot');
    return;
  }

  // Используем webhook в production или polling в development
  if (process.env.WEBHOOK_URL) {
    const webhookUrl = `${process.env.WEBHOOK_URL}/api/telegram`;
    await telegrafBot.telegram.setWebhook(webhookUrl);
    console.log(`Bot webhook set to: ${webhookUrl}`);
  } else {
    telegrafBot.launch();
    console.log('Bot started in polling mode');
  }
}
