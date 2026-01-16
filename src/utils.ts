import { BudgetData } from './types';

export function formatBudgetMessage(budget: BudgetData): string {
  let total = 0 //сумма транзакций
  let totalExpenses = 0 //расходы (положительное число)
  let totalIncome = 0 //доходы
  
  budget.transactions.forEach((t) => {
    total += t.amount;
    if(t.amount < 0) {
      totalExpenses += Math.abs(t.amount);
    } else {
      totalIncome += t.amount;
    }
  });
  
  const period = budget.period || 30;
  const remaining = (budget.monthlyBudget) + total; // Остаток
  const dailyBudget = remaining / period;

  const now = new Date();
  const createdDate = new Date(budget.createdDate);
  const daysPassed =
    Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  const currentDay = Math.min(daysPassed, period);
  
  // Считаем только сегодняшние траты и доходы
  let todayExpenses = 0;
  
  budget.transactions.forEach((t) => {
    const tDate = new Date(t.date);
    if (tDate.toDateString() === now.toDateString()) {
      if (t.amount < 0) {
        todayExpenses += Math.abs(t.amount);
      }
    }
  });

  // Для расчета экономии используем только завершенные дни
  const completedDays = currentDay - 1;
  const planedSpentCompleted = budget.monthlyBudget / budget.period * completedDays;
  const planedRemainingCompleted = budget.monthlyBudget - planedSpentCompleted;
  
  // Экономия = фактический остаток - плановый остаток (по завершенным дням)
  const saved = remaining - planedRemainingCompleted;
  let canSpendToday = dailyBudget + (saved > 0 ? saved : 0);

  let savedInfo = '';
  // Показываем экономию/перерасход только если есть завершенные дни
  if (completedDays > 0) {
    if (saved > 0) {
      savedInfo = `\n👌 *Сэкономлено:* ${saved.toFixed(2)} руб.`;
    } else if (saved < 0) {
      savedInfo = `\n⚠️ *Перерасход:* ${Math.abs(saved).toFixed(2)} руб.`;
    }
  }

  console.log({saved, remaining, canSpendToday, planedSpentCompleted, planedRemainingCompleted, completedDays});
  

  // Можно потратить сегодня = дневной лимит + сэкономленное ранее

  // Предупреждение при превышении лимита
  let warning = '';
  if (canSpendToday < 0) {
    warning = `\n⚠️ *Превышен дневной лимит на:* ${Math.abs(canSpendToday).toFixed(2)} руб.`;
  }

  const message = `
📊 *Статус Бюджета*

📅 *Период:* ${currentDay}/${period}
💰 *Бюджет на период:* ${budget.monthlyBudget.toFixed(2)} руб.

💸 *Траты:* -${totalExpenses.toFixed(2)} руб.
💵 *Пополнения:* +${totalIncome.toFixed(2)} руб.
✅ *Остаток:* ${remaining.toFixed(2)} руб.

📈 *Можно потратить сегодня:* ${canSpendToday.toFixed(2)} руб.${warning} ${savedInfo}
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
