'use client';

import { useState } from 'react';
import { Transaction } from '@/types';
import styles from './DayNavigator.module.css';

interface DayNavigatorProps {
  createdDate: string;
  periodDays: number;
  transactions: Transaction[];
  totalBudget: number;
  plannedDailyBudget: number;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2) + '\u00A0₽';
}

export default function DayNavigator({ 
  createdDate, 
  periodDays, 
  transactions,
  totalBudget,
  plannedDailyBudget
}: DayNavigatorProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startDate = new Date(createdDate);
  startDate.setHours(0, 0, 0, 0);
  
  // Calculate current day number (1-based)
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const currentDayNum = Math.min(Math.max(daysSinceStart + 1, 1), periodDays);
  
  // State: selected day number (1 to periodDays)
  const [selectedDayNum, setSelectedDayNum] = useState(currentDayNum);
  
  // Calculate selected date based on day number
  const selectedDate = new Date(startDate);
  selectedDate.setDate(selectedDate.getDate() + selectedDayNum - 1);
  
  // Is this a future day (after today)?
  const isFutureDay = selectedDayNum > currentDayNum;
  const isToday = selectedDayNum === currentDayNum;
  
  // Filter transactions for selected day
  const dayTransactions = transactions.filter(t => {
    const tDate = new Date(t.date);
    return tDate.toDateString() === selectedDate.toDateString();
  });
  
  // Calculate day stats
  const dayExpenses = dayTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const dayIncome = dayTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Calculate starting day limit - what the daily budget was at the START of this day
  // This is: (remaining budget at start of day) / (remaining days including this day)
  const calculateStartingDayLimit = () => {
    if (isFutureDay) {
      return plannedDailyBudget;
    }
    
    // Get all transactions BEFORE this day (not including this day's transactions)
    const transactionsBeforeThisDay = transactions.filter(t => {
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      return tDate.getTime() < selectedDate.getTime();
    });
    
    // Calculate remaining budget at the start of selected day
    const spentBeforeThisDay = transactionsBeforeThisDay.reduce((sum, t) => sum + t.amount, 0);
    const remainingAtDayStart = totalBudget + spentBeforeThisDay; // t.amount is negative for expenses
    
    // Calculate remaining days at the start of this day (including this day)
    const remainingDaysAtStart = periodDays - selectedDayNum + 1;
    
    return remainingAtDayStart / remainingDaysAtStart;
  };
  
  const startingDayLimit = calculateStartingDayLimit();
  // Баланс дня = лимит - расходы + доходы = сколько осталось/перерасход от лимита
  const dayBalance = startingDayLimit - dayExpenses + dayIncome;
  
  // Navigation limits - can navigate all days in period (1 to periodDays)
  const canGoBack = selectedDayNum > 1;
  const canGoForward = selectedDayNum < periodDays;
  
  const goToPreviousDay = () => {
    if (canGoBack) {
      setSelectedDayNum(prev => prev - 1);
    }
  };
  
  const goToNextDay = () => {
    if (canGoForward) {
      setSelectedDayNum(prev => prev + 1);
    }
  };
  
  const goToToday = () => {
    setSelectedDayNum(currentDayNum);
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.navigator}>
        <button 
          className={styles.navButton} 
          onClick={goToPreviousDay}
          disabled={!canGoBack}
        >
          ◀
        </button>
        
        <div className={styles.dateInfo}>
          <div className={styles.dayNumber}>
            День {selectedDayNum}/{periodDays}
          </div>
          <div className={styles.dateText}>
            {formatDate(selectedDate)}
            {isToday && <span className={styles.todayBadge}>сегодня</span>}
          </div>
        </div>
        
        <button 
          className={styles.navButton} 
          onClick={goToNextDay}
          disabled={!canGoForward}
        >
          ▶
        </button>
      </div>
      
      {!isToday && (
        <button className={styles.todayButton} onClick={goToToday}>
          ↩ Вернуться к сегодня
        </button>
      )}
      
      <div className={styles.dayStats}>
        {isFutureDay && (
          <div className={styles.plannedBadge}>📅 Плановые значения</div>
        )}
        <div className={styles.statRow}>
          <span className={styles.statLabel}>
            {isFutureDay ? 'Плановый лимит:' : 'Лимит на день:'}
          </span>
          <span className={styles.statValue}>{formatCurrency(startingDayLimit)}</span>
        </div>
        {!isFutureDay && (
          <>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Расходы:</span>
              <span className={styles.statValueExpense}>-{formatCurrency(dayExpenses)}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Доходы:</span>
              <span className={styles.statValueIncome}>+{formatCurrency(dayIncome)}</span>
            </div>
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Баланс дня:</span>
              <span className={`${styles.statValue} ${dayBalance >= 0 ? styles.positive : styles.negative}`}>
                {dayBalance >= 0 ? '+' : ''}{formatCurrency(dayBalance)}
              </span>
            </div>
          </>
        )}
        {isFutureDay && (
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Ожидаемый баланс:</span>
            <span className={`${styles.statValue} ${styles.positive}`}>
              +{formatCurrency(plannedDailyBudget)}
            </span>
          </div>
        )}
      </div>
      
      {!isFutureDay && dayTransactions.length > 0 && (
        <div className={styles.transactionsList}>
          <div className={styles.transactionsTitle}>Транзакции за день:</div>
          {dayTransactions.map(t => (
            <div key={t.id} className={styles.transactionItem}>
              <div className={styles.transactionInfo}>
                <span className={styles.transactionDesc}>{t.description}</span>
                <span className={styles.transactionTime}>
                  {new Date(t.date).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <span className={`${styles.transactionAmount} ${t.amount < 0 ? styles.expense : styles.income}`}>
                {t.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(t.amount))}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {!isFutureDay && dayTransactions.length === 0 && (
        <div className={styles.emptyDay}>
          Нет транзакций за этот день
        </div>
      )}
      
      {isFutureDay && (
        <div className={styles.emptyDay}>
          📅 Этот день ещё не наступил
        </div>
      )}
    </div>
  );
}
