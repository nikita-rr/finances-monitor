import { BudgetData, Transaction, ChatBudget } from './types';
import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(__dirname, '../data.json');

class BudgetStorage {
  private budgets: ChatBudget = {};

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        this.budgets = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading data from file:', error);
      this.budgets = {};
    }
  }

  private saveToFile(): void {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.budgets, null, 2));
    } catch (error) {
      console.error('Error saving data to file:', error);
    }
  }

  initBudget(chatId: number, monthlyBudget: number): BudgetData {
    const budget: BudgetData = {
      monthlyBudget,
      currentSpent: 0,
      transactions: [],
      createdDate: new Date(),
    };
    this.budgets[chatId] = budget;
    this.saveToFile();
    return budget;
  }

  getBudget(chatId: number): BudgetData | null {
    return this.budgets[chatId] || null;
  }

  addTransaction(
    chatId: number,
    amount: number,
    description: string,
    userId: number,
    userName?: string
  ): BudgetData | null {
    const budget = this.budgets[chatId];
    if (!budget) return null;

    const transaction: Transaction = {
      amount,
      description,
      date: new Date(),
      userId,
      userName,
    };

    budget.transactions.push(transaction);
    // Расходы (отрицательные) уменьшают бюджет, доходы (положительные) увеличивают
    budget.currentSpent -= amount; // Меняем знак: -300 становится +300 для currentSpent

    this.saveToFile();
    return budget;
  }

  getAllBudgets(): ChatBudget {
    return this.budgets;
  }

  updatePinnedMessageId(chatId: number, messageId: number): void {
    if (this.budgets[chatId]) {
      this.budgets[chatId].pinnedMessageId = messageId;
      this.saveToFile();
    }
  }

  getRemainingSummary(
    chatId: number
  ): {
    monthlyRemaining: number;
    dailyRemaining: number;
    daysPassed: number;
  } | null {
    const budget = this.budgets[chatId];
    if (!budget) return null;

    const now = new Date();
    const createdDate = new Date(budget.createdDate);
    const daysPassed =
      Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    const monthlyRemaining = budget.monthlyBudget - budget.currentSpent;
    const dailyBudget = budget.monthlyBudget / 30;
    const dailyRemaining = dailyBudget * daysPassed - budget.currentSpent;

    return {
      monthlyRemaining,
      dailyRemaining,
      daysPassed: Math.min(daysPassed, 30),
    };
  }
}

export const budgetStorage = new BudgetStorage();
