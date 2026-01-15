import { BudgetData } from './types';

export function formatBudgetMessage(budget: BudgetData): string {
  // currentSpent может быть отрицательным из-за старых данных, берем абсолютное значение
  const spent = Math.abs(budget.currentSpent);
  const monthlyRemaining = budget.monthlyBudget - spent;
  const period = budget.period || 30;
  const dailyBudget = budget.monthlyBudget / period;

  const now = new Date();
  const createdDate = new Date(budget.createdDate);
  const daysPassed =
    Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  const currentDay = Math.min(daysPassed, period);
  const dailyRemaining = dailyBudget * currentDay - spent;

  const message = `
📊 *Статус Бюджета*

💰 *Бюджет на период:* ${budget.monthlyBudget.toFixed(2)} руб.
💸 *Потрачено:* ${spent.toFixed(2)} руб.
✅ *Осталось:* ${monthlyRemaining.toFixed(2)} руб.

📅 *День:* ${currentDay}/${period}
📈 *Дневной лимит:* ${dailyBudget.toFixed(2)} руб.
💳 *На сегодня осталось:* ${Math.max(0, dailyRemaining).toFixed(2)} руб.

${
  dailyRemaining < 0
    ? `⚠️ *Превышение дневного лимита на:* ${Math.abs(dailyRemaining).toFixed(2)} руб.`
    : ''
}
${
  monthlyRemaining < 0
    ? `🚨 *Превышен бюджет на:* ${Math.abs(monthlyRemaining).toFixed(2)} руб.`
    : ''
}

📝 *Последние траты:*
`;

  const recentTransactions = budget.transactions.slice(-5).reverse();
  if (recentTransactions.length === 0) {
    return message + '\nНет трат';
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
  
  // Regex pattern: число с необязательным описанием
  const pattern = /(-?\d+(?:\.\d{1,2})?)(?:\s+([^-\n]+?))?(?=\s*-?\d|$)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const amount = parseFloat(match[1]);
    const description = match[2] ? match[2].trim() : 'без описания';

    // Проверяем что число валидное
    if (!isNaN(amount)) {
      transactions.push({
        amount,
        description,
      });
    }
  }

  return transactions;
}
