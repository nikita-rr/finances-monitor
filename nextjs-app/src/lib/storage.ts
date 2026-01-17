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
  userName?: string,
  receiptBase64s?: string[],
  receiptOriginalNames?: string[]
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
  // If receipts provided (base64 array), save them to data/uploads and record filenames
  if (receiptBase64s && receiptBase64s.length > 0) {
    try {
      const dataDir = path.dirname(DATA_FILE);
      const uploadsDir = path.join(dataDir, 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const savedFiles: string[] = [];

      for (let i = 0; i < receiptBase64s.length; i++) {
        const receiptBase64 = receiptBase64s[i];
        const receiptOriginalName = receiptOriginalNames && receiptOriginalNames[i] ? receiptOriginalNames[i] : undefined;

        // Determine extension from original name if present
        let ext = '.png';
        if (receiptOriginalName) {
          const parsed = path.parse(receiptOriginalName);
          if (parsed.ext) ext = parsed.ext;
        }

        const fileName = `${uuidv4()}${ext}`;
        const filePath = path.join(uploadsDir, fileName);

        const base64Data = receiptBase64.replace(/^data:.+;base64,/, '');
        fs.writeFileSync(filePath, base64Data, 'base64');

        savedFiles.push(fileName);
      }

      (transaction as any).receiptFiles = savedFiles;
    } catch (err) {
      console.error('Error saving receipt files:', err);
    }
  }

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
