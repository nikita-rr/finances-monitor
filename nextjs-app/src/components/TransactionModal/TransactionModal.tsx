'use client';

import { useState } from 'react';
import styles from './TransactionModal.module.css';

interface TransactionModalProps {
  isOpen: boolean;
  type: 'expense' | 'income';
  onClose: () => void;
  onSubmit: (amount: number, description: string) => Promise<void>;
}

export default function TransactionModal({ 
  isOpen, 
  type, 
  onClose, 
  onSubmit 
}: TransactionModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Введите корректную сумму');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(amountNum, description || 'Без описания');
      setAmount('');
      setDescription('');
      onClose();
    } catch (err) {
      setError('Ошибка при добавлении транзакции');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {type === 'expense' ? '➖ Добавить расход' : '➕ Добавить доход'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Сумма (₽)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={styles.input}
              min="0.01"
              step="any"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'expense' ? 'На что потрачено...' : 'Источник дохода...'}
              className={styles.input}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button 
            type="submit" 
            className={`${styles.button} ${type === 'expense' ? styles.expenseBtn : styles.incomeBtn}`}
            disabled={loading}
          >
            {loading ? 'Добавление...' : (type === 'expense' ? '➖ Добавить расход' : '➕ Добавить доход')}
          </button>
        </form>
      </div>
    </div>
  );
}
