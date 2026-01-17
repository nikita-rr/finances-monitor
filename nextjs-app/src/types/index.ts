// Types for the finance monitor application

export interface Transaction {
  id: string;
  amount: number; // negative for expenses, positive for income
  description: string;
  date: string; // ISO date string
  userId?: number;
  userName?: string;
  receiptFiles?: string[]; // optional filenames for uploaded receipts
}

export interface Budget {
  id: string;
  totalBudget: number;
  periodDays: number;
  createdDate: string; // ISO date string
  transactions: Transaction[];
  telegramChatId?: number;
  telegramMessageId?: number;
}

export interface BudgetCalculations {
  // Basic info
  totalBudget: number;
  periodDays: number;
  currentDay: number;
  remainingDays: number;
  
  // Planned vs Actual
  plannedDailyBudget: number;
  actualDailyBudget: number;
  
  // Remaining
  totalSpent: number;
  totalIncome: number;
  remaining: number;
  
  // Today
  todayExpenses: number;
  todayIncome: number;
  todayNet: number;
  todayBalance: number;
  
  // Savings/Overspend
  saved: number;
  overspendToday: number;
  
  // Tomorrow forecast
  tomorrowDailyBudget: number;
  dailyBudgetChange: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BudgetResponse extends ApiResponse {
  budget?: Budget;
  calculations?: BudgetCalculations;
}

export interface CreateBudgetRequest {
  amount: number;
  period: number;
  chatId?: number;
}

export interface TransactionRequest {
  amount: number;
  description: string;
  userId?: number;
  userName?: string;
}
