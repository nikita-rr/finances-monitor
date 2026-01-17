'use client';

import { useState } from 'react';
import styles from './CreateBudget.module.css';

interface CreateBudgetProps {
  onCreateBudget: (amount: number, period: number) => Promise<void>;
}

export default function CreateBudget({ onCreateBudget }: CreateBudgetProps) {
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('14');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const amountNum = parseFloat(amount);
    const periodNum = parseInt(period);

    if (!amountNum || amountNum <= 0) {
      setError('Введите корректную сумму бюджета');
      return;
    }

    if (!periodNum || periodNum <= 0 || periodNum > 365) {
      setError('Период должен быть от 1 до 365 дней');
      return;
    }

    try {
      setLoading(true);
      await onCreateBudget(amountNum, periodNum);
    } catch (err) {
      setError('Ошибка при создании бюджета');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>💰 Создать бюджет</h2>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Сумма бюджета (₽)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="50000"
            className={styles.input}
            min="1"
            step="any"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Период (дней)</label>
          <input
            type="number"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="14"
            className={styles.input}
            min="1"
            max="365"
          />
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button 
          type="submit" 
          className={styles.button}
          disabled={loading}
        >
          {loading ? 'Создание...' : '✅ Создать бюджет'}
        </button>
      </form>

      <div className={styles.hint}>
        <p>Укажите общую сумму, которую планируете потратить за период.</p>
        <p>Дневной лимит рассчитается автоматически.</p>
      </div>
    </div>
  );
}
