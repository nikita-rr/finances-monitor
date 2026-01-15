export interface BudgetData {
  monthlyBudget: number;
  currentSpent: number;
  transactions: Transaction[];
  pinnedMessageId?: number;
  createdDate: Date;
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
