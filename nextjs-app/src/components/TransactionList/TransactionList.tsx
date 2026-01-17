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

  // Show all transactions, newest first
  const sortedTransactions = [...transactions].reverse();

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>📝 Все транзакции</h3>
      
      <div className={styles.list}>
        {sortedTransactions.map((t) => {
          const isExpense = t.amount < 0;
          
          return (
            <div key={t.id} className={styles.item}>
              <div className={styles.info}>
                <div className={styles.description}>{t.description}</div>
                <div className={styles.date}>{formatDate(t.date)}</div>
                {t.userName && (
                  <div className={styles.user}>👤 {t.userName}</div>
                )}
                {t.receiptFiles && t.receiptFiles.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                    {t.receiptFiles.map((f) => (
                      <img key={f} src={`/api/receipt/${f}`} alt="Чек" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                    ))}
                  </div>
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
