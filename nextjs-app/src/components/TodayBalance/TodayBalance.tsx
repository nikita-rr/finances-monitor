'use client';

import { BudgetCalculations } from '@/types';
import styles from './TodayBalance.module.css';

interface TodayBalanceProps {
  calculations: BudgetCalculations;
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2) + '\u00A0₽';
}

export default function TodayBalance({ calculations }: TodayBalanceProps) {
  const stats = calculations;
  
  return (
    <div className={styles.container}>
      <div className={styles.todaySection}>
        <div className={styles.todayLabel}>📅 Баланс сегодня:</div>
        <div className={`${styles.todayValue} ${stats.todayBalance >= 0 ? styles.positive : styles.negative}`}>
          {stats.todayBalance >= 0 ? '+' : ''}{formatCurrency(stats.todayBalance)}
        </div>
        
        {/* Предупреждение о перерасходе сегодня */}
        {stats.todayBalance < 0 && (
          <div className={styles.warning}>
            ⚠️ Перерасход сегодня: {formatCurrency(Math.abs(stats.todayBalance))}
          </div>
        )}

        {/* Прогноз на завтра */}
        {stats.remainingDays > 1 && (
          <div className={stats.todayBalance < 0 ? styles.warning : styles.info}>
            {stats.todayBalance < 0 ? (
              <>📉 Завтра лимит уменьшится до: {formatCurrency(stats.tomorrowDailyBudget)}</>
            ) : (
              <>📈 Если не тратить сегодня, завтра лимит будет: {formatCurrency(stats.tomorrowDailyBudget)}</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
