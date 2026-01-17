'use client';

import { Transaction } from '@/types';
import styles from './TransactionList.module.css';

interface TransactionListProps {
  transactions: Transaction[];
}

function formatCurrency(amount: number): string {
  return Math.abs(amount).toFixed(2) + ' ₽';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export default function TransactionList({ transactions }: TransactionListProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>📝 Транзакции</h3>
        <p className={styles.empty}>Нет транзакций</p>
      </div>
    );
  }

  // Show last 10 transactions, newest first
  const recentTransactions = [...transactions].slice(-10).reverse();

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>📝 Последние транзакции</h3>
      
      <div className={styles.list}>
        {recentTransactions.map((t) => {
          const isExpense = t.amount < 0;
          
          return (
            <div key={t.id} className={styles.item}>
              <div className={styles.info}>
                <div className={styles.description}>{t.description}</div>
                <div className={styles.date}>{formatDate(t.date)}</div>
                {t.userName && (
                  <div className={styles.user}>👤 {t.userName}</div>
                )}
              </div>
              <div className={`${styles.amount} ${isExpense ? styles.expense : styles.income}`}>
                {isExpense ? '-' : '+'}{formatCurrency(t.amount)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
