'use client';

import { BudgetCalculations } from '@/types';
import styles from './BudgetStatus.module.css';

interface BudgetStatusProps {
  calculations: BudgetCalculations;
  createdDate: string;
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2) + ' ₽';
}

export default function BudgetStatus({ calculations, createdDate }: BudgetStatusProps) {
  const stats = calculations;
  
  return (
    <div className={styles.container}>
      <div className={styles.statusCard}>
        <div className={styles.row}>
          <span className={styles.label}>📅 Дата создания:</span>
          <span className={styles.value}>
            {new Date(createdDate).toLocaleDateString('ru-RU')}
          </span>
        </div>
        
        <div className={styles.row}>
          <span className={styles.label}>📅 Период:</span>
          <span className={styles.value}>
            {stats.currentDay}/{stats.periodDays} день
          </span>
        </div>
        
        <div className={styles.row}>
          <span className={styles.label}>💰 Бюджет:</span>
          <span className={styles.value}>{formatCurrency(stats.totalBudget)}</span>
        </div>
        
        <div className={styles.row}>
          <span className={styles.label}>✅ Остаток:</span>
          <span className={styles.value}>{formatCurrency(stats.remaining)}</span>
        </div>

        <div className={styles.divider} />
        
        <div className={styles.row}>
          <span className={styles.label}>📉 Плановый дневной:</span>
          <span className={styles.value}>{formatCurrency(stats.plannedDailyBudget)}</span>
        </div>
        
        <div className={styles.row}>
          <span className={styles.label}>📈 Фактический дневной:</span>
          <span className={styles.value}>{formatCurrency(stats.actualDailyBudget)}</span>
        </div>

        <div className={styles.divider} />
        
        <div className={styles.row}>
          <span className={styles.label}>💸 Расходы за период:</span>
          <span className={styles.valueExpense}>-{formatCurrency(stats.totalSpent)}</span>
        </div>
        
        <div className={styles.row}>
          <span className={styles.label}>💵 Доходы за период:</span>
          <span className={styles.valueIncome}>+{formatCurrency(stats.totalIncome)}</span>
        </div>

        <div className={styles.divider} />
        
        <div className={styles.todaySection}>
          <div className={styles.todayLabel}>📅 Баланс сегодня:</div>
          <div className={`${styles.todayValue} ${stats.todayBalance >= 0 ? styles.positive : styles.negative}`}>
            {stats.todayBalance >= 0 ? '+' : ''}{formatCurrency(stats.todayBalance)}
          </div>
          
          {/* Предупреждение о перерасходе сегодня - только при отрицательном балансе */}
          {stats.todayBalance < 0 && (
            <div className={styles.warning}>
              ⚠️ Перерасход сегодня: {formatCurrency(Math.abs(stats.todayBalance))}
            </div>
          )}

          {/* Прогноз на завтра */}
          {stats.remainingDays > 1 && (
            <div className={stats.todayBalance < 0 ? styles.warning : styles.info}>
              {stats.todayBalance < 0 ? (
                <>
                  📉 Завтра лимит уменьшится до: {formatCurrency(stats.tomorrowDailyBudget)}
                </>
              ) : (
                <>
                  📈 Если не тратить сегодня, завтра лимит будет: {formatCurrency(stats.tomorrowDailyBudget)}
                </>
              )}
            </div>
          )}
        </div>

        {/* Итоговая экономия/перерасход за весь период */}
        {stats.saved > 0 && stats.todayBalance >= 0 && (
          <div className={styles.info}>
            💎 Сэкономлено за период: {formatCurrency(stats.saved)}
          </div>
        )}
        
        {stats.saved < 0 && (
          <div className={styles.warning}>
            ⚠️ Перерасход за период: {formatCurrency(Math.abs(stats.saved))}
          </div>
        )}
      </div>
    </div>
  );
}
