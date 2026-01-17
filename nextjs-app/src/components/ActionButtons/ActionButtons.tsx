'use client';

import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  onAddExpense: () => void;
  onAddIncome: () => void;
}

export default function ActionButtons({ onAddExpense, onAddIncome }: ActionButtonsProps) {
  return (
    <div className={styles.container}>
      <button className={`${styles.button} ${styles.expense}`} onClick={onAddExpense}>
        ➖ Расход
      </button>
      <button className={`${styles.button} ${styles.income}`} onClick={onAddIncome}>
        ➕ Доход
      </button>
    </div>
  );
}
