export interface BudgetData {
  monthlyBudget: number;
  currentSpent: number;
  transactions: Transaction[];
  pinnedMessageId?: number;
  pinnedChatId?: number;
  createdDate: Date;
  period: number; // Количество дней для распределения бюджета (по умолчанию 30)
}

export interface Transaction {
  amount: number;
  description: string;
  date: Date;
  userId: number;
  userName?: string;
}

export interface ChatBudget {
  [chatId: number]: BudgetData;
}
