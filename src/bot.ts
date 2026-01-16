import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { budgetStorage } from './storage';
import { formatBudgetMessage } from './utils';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
  throw new Error('BOT_TOKEN not found in environment variables');
}

const bot = new Telegraf(token);

export { bot };

export async function updatePinnedMessageFromAPI(): Promise<void> {
  const budget = budgetStorage.getBudget();
  if (!budget || !budget.pinnedMessageId || !budget.pinnedChatId) {
    return;
  }

  try {
    const message = formatBudgetMessage(budget);
    await bot.telegram.editMessageText(
      budget.pinnedChatId,
      budget.pinnedMessageId,
      undefined,
      message,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Error updating pinned message from API:', error);
  }
}
