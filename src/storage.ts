import { BudgetData, Transaction } from './types';
import * as fs from 'fs';
import * as path from 'path';

const DATA_FILE = path.join(__dirname, '../data.json');

class BudgetStorage {
  private budget: BudgetData | null = null;

  constructor() {
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        // Загружаем общий бюджет из файла
        this.budget = parsed.budget || null;
      }
    } catch (error) {
      console.error('Error loading data from file:', error);
      this.budget = null;
    }
  }

  private saveToFile(): void {
    try {
      const data = { budget: this.budget };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving data to file:', error);
    }
  }

  initBudget(monthlyBudget: number, period: number = 30): BudgetData {
    this.budget = {
      monthlyBudget,
      currentSpent: 0,
      transactions: [],
      createdDate: new Date(),
      period,
    };
    this.saveToFile();
    return this.budget;
  }

  getBudget(): BudgetData | null {
    return this.budget;
  }

  addTransaction(
    amount: number,
    description: string,
    userId: number,
    userName?: string
  ): BudgetData | null {
    if (!this.budget) return null;

    const transaction: Transaction = {
      amount,
      description,
      date: new Date(),
      userId,
      userName,
    };

    this.budget.transactions.push(transaction);
    this.budget.currentSpent -= amount;

    this.saveToFile();
    return this.budget;
  }

  updatePinnedMessageId(messageId: number, chatId?: number): void {
    if (this.budget) {
      this.budget.pinnedMessageId = messageId;
      if (chatId !== undefined) {
        this.budget.pinnedChatId = chatId;
      }
      this.saveToFile();
    }
  }

  resetTransactions(): number {
    if (!this.budget) return 0;

    const transactionsCount = this.budget.transactions.length;
    this.budget.transactions = [];
    this.budget.currentSpent = 0;

    this.saveToFile();
    return transactionsCount;
  }

  getRemainingSummary(): {
    monthlyRemaining: number;
    dailyRemaining: number;
    daysPassed: number;
  } | null {
    if (!this.budget) return null;

    const period = this.budget.period || 30;
    const now = new Date();
    const createdDate = new Date(this.budget.createdDate);
    const daysPassed =
      Math.floor(
        (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

    const monthlyRemaining = this.budget.monthlyBudget - this.budget.currentSpent;
    const dailyBudget = this.budget.monthlyBudget / period;
    const dailyRemaining = dailyBudget * daysPassed - this.budget.currentSpent;

    return {
      monthlyRemaining,
      dailyRemaining,
      daysPassed: Math.min(daysPassed, period),
    };
  }
}

export const budgetStorage = new BudgetStorage();
