import fs from 'fs';
import path from 'path';
import { Budget, Transaction } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const DATA_FILE = process.env.DATA_FILE || path.join(process.cwd(), 'data.json');

interface StorageData {
  budget: Budget | null;
}

function readData(): StorageData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading data file:', error);
  }
  return { budget: null };
}

function writeData(data: StorageData): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error writing data file:', error);
  }
}

export function getBudget(): Budget | null {
  const data = readData();
  return data.budget;
}

export function createBudget(totalBudget: number, periodDays: number, chatId?: number): Budget {
  const budget: Budget = {
    id: uuidv4(),
    totalBudget,
    periodDays,
    createdDate: new Date().toISOString(),
    transactions: [],
    telegramChatId: chatId,
  };
  
  writeData({ budget });
  return budget;
}

export function updateBudget(budget: Budget): void {
  writeData({ budget });
}

export function addTransaction(
  amount: number,
  description: string,
  userId?: number,
  userName?: string
): Transaction | null {
  const data = readData();
  if (!data.budget) {
    return null;
  }

  const transaction: Transaction = {
    id: uuidv4(),
    amount,
    description,
    date: new Date().toISOString(),
    userId,
    userName,
  };

  data.budget.transactions.push(transaction);
  writeData(data);
  
  return transaction;
}

export function deleteBudget(): void {
  writeData({ budget: null });
}

export function setTelegramMessage(chatId: number, messageId: number): void {
  const data = readData();
  if (data.budget) {
    data.budget.telegramChatId = chatId;
    data.budget.telegramMessageId = messageId;
    writeData(data);
  }
}

export function deleteTransaction(transactionId: string): boolean {
  const data = readData();
  if (!data.budget) {
    return false;
  }

  const index = data.budget.transactions.findIndex(t => t.id === transactionId);
  if (index === -1) {
    return false;
  }

  data.budget.transactions.splice(index, 1);
  writeData(data);
  return true;
}

export function getLastTransactions(count: number = 10): Transaction[] {
  const data = readData();
  if (!data.budget) {
    return [];
  }
  return data.budget.transactions.slice(-count).reverse();
}
