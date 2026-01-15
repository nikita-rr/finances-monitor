import { BudgetData } from './types';

export function formatBudgetMessage(budget: BudgetData): string {
  const monthlyRemaining = budget.monthlyBudget - budget.currentSpent;
  const dailyBudget = budget.monthlyBudget / 30;

  const now = new Date();
  const createdDate = new Date(budget.createdDate);
  const daysPassed =
    Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  const currentDay = Math.min(daysPassed, 30);
  const dailyRemaining = dailyBudget * currentDay - budget.currentSpent;

  const message = `
📊 *Статус Бюджета*

💰 *Месячный бюджет:* ${budget.monthlyBudget.toFixed(2)} руб.
💸 *Потрачено:* ${budget.currentSpent.toFixed(2)} руб.
✅ *Осталось на месяц:* ${monthlyRemaining.toFixed(2)} руб.

📅 *День:* ${currentDay}/30
📈 *Дневной лимит:* ${dailyBudget.toFixed(2)} руб.
💳 *На сегодня осталось:* ${Math.max(0, dailyRemaining).toFixed(2)} руб.

${
  dailyRemaining < 0
    ? `⚠️ *Превышение дневного лимита на:* ${Math.abs(dailyRemaining).toFixed(2)} руб.`
    : ''
}
${
  monthlyRemaining < 0
    ? `🚨 *Превышен месячный бюджет на:* ${Math.abs(monthlyRemaining).toFixed(2)} руб.`
    : ''
}

📝 *Последние транзакции:*
`;

  const recentTransactions = budget.transactions.slice(-5).reverse();
  if (recentTransactions.length === 0) {
    return message + '\nНет транзакций';
  }

  const transactions = recentTransactions
    .map((t) => {
      const sign = t.amount > 0 ? '+' : '';
      return `${sign}${t.amount.toFixed(2)} - ${t.description}`;
    })
    .join('\n');

  return message + transactions;
}

export function parseTransactions(text: string): Array<{ amount: number; description: string }> {
  const transactions: Array<{ amount: number; description: string }> = [];
  
  // Regex pattern: -number description, -number description
  const pattern = /(-?\d+(?:\.\d{1,2})?)\s+([^-\n]+?)(?=\s*-\d|$)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const amount = parseFloat(match[1]);
    const description = match[2].trim();

    if (description) {
      transactions.push({
        amount,
        description,
      });
    }
  }

  return transactions;
}
