import { Budget, BudgetCalculations } from '@/types';

export function calculateBudgetStats(budget: Budget): BudgetCalculations {
  const now = new Date();
  const today = now.toDateString();
  
  // Calculate days passed (calendar days)
  const createdDate = new Date(budget.createdDate);
  const createdDateOnly = new Date(createdDate);
  createdDateOnly.setHours(0, 0, 0, 0);
  
  const todayDateOnly = new Date(now);
  todayDateOnly.setHours(0, 0, 0, 0);
  
  const daysPassed = Math.floor(
    (todayDateOnly.getTime() - createdDateOnly.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  const currentDay = Math.min(daysPassed, budget.periodDays);
  const remainingDays = Math.max(1, budget.periodDays - currentDay + 1);
  
  // Calculate totals
  let totalSpent = 0;
  let totalIncome = 0;
  let todayExpenses = 0;
  let todayIncome = 0;
  
  budget.transactions.forEach((t) => {
    if (t.amount < 0) {
      totalSpent += Math.abs(t.amount);
    } else {
      totalIncome += t.amount;
    }
    
    const tDate = new Date(t.date);
    if (tDate.toDateString() === today) {
      if (t.amount < 0) {
        todayExpenses += Math.abs(t.amount);
      } else {
        todayIncome += t.amount;
      }
    }
  });
  
  const todayNet = todayIncome - todayExpenses;
  
  // Net balance from all transactions
  const netTransactions = budget.transactions.reduce((sum, t) => sum + t.amount, 0);
  const remaining = budget.totalBudget + netTransactions;
  
  // Planned daily budget (fixed)
  const plannedDailyBudget = budget.totalBudget / budget.periodDays;
  
  // Actual daily budget = (totalBudget + all transactions) / remaining days
  const actualDailyBudget = remaining / remainingDays;
  
  // Calculate starting day limit for TODAY (what the daily budget was at the START of today)
  // Get all transactions BEFORE today
  const transactionsBeforeToday = budget.transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate.toDateString() !== today;
  });
  const spentBeforeToday = transactionsBeforeToday.reduce((sum, t) => sum + t.amount, 0);
  const remainingAtTodayStart = budget.totalBudget + spentBeforeToday;
  const startingDayLimit = remainingAtTodayStart / remainingDays;
  
  // Today's balance = starting day limit - today's expenses + today's income
  const todayBalance = startingDayLimit - todayExpenses + todayIncome;
  
  // Overspend today (if todayBalance is negative)
  const overspendToday = Math.max(0, -todayBalance);
  
  // Savings calculation - how much we saved compared to plan
  const completedDays = currentDay - 1;
  const plannedSpentCompleted = plannedDailyBudget * completedDays;
  const plannedRemainingCompleted = budget.totalBudget - plannedSpentCompleted;
  const saved = remainingAtTodayStart - plannedRemainingCompleted;
  
  // Tomorrow forecast - what will be the daily limit tomorrow
  const daysLeftAfterToday = remainingDays - 1;
  const tomorrowDailyBudget = daysLeftAfterToday > 0 
    ? remaining / daysLeftAfterToday 
    : remaining;
  const dailyBudgetChange = tomorrowDailyBudget - startingDayLimit;
  
  return {
    totalBudget: budget.totalBudget,
    periodDays: budget.periodDays,
    currentDay,
    remainingDays,
    plannedDailyBudget,
    actualDailyBudget,
    totalSpent,
    totalIncome,
    remaining,
    todayExpenses,
    todayIncome,
    todayNet,
    todayBalance,
    saved,
    overspendToday,
    tomorrowDailyBudget,
    dailyBudgetChange,
  };
}

export function formatCurrency(amount: number): string {
  return amount.toFixed(2) + ' ₽';
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU');
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
