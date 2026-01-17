'use client';

import { useState, useEffect, useCallback } from 'react';
import { Budget, BudgetCalculations } from '@/types';
import { 
  BudgetStatus, 
  CreateBudget, 
  TransactionList, 
  TransactionModal,
  ActionButtons 
} from '@/components';
import styles from './page.module.css';

// Declare Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
          };
        };
        showAlert: (message: string) => void;
        HapticFeedback: {
          notificationOccurred: (type: 'success' | 'error' | 'warning') => void;
        };
      };
    };
  }
}

export default function Home() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [calculations, setCalculations] = useState<BudgetCalculations | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>('expense');

  // Initialize Telegram WebApp
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      // Apply theme
      const root = document.documentElement;
      root.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
      root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
      root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
      root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
      root.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
      root.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f4f4f5');
    }
  }, []);

  // Load budget data
  const loadBudget = useCallback(async () => {
    try {
      const response = await fetch('/api/budget');
      const data = await response.json();
      
      if (data.success && data.budget) {
        setBudget(data.budget);
        setCalculations(data.calculations);
      } else {
        setBudget(null);
        setCalculations(null);
      }
    } catch (error) {
      console.error('Error loading budget:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup SSE for real-time updates
  useEffect(() => {
    loadBudget();

    const eventSource = new EventSource('/api/events');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected' || data.type === 'budget-update') {
          if (data.budget) {
            setBudget(data.budget);
            setCalculations(data.calculations);
          }
        } else if (data.type === 'budget-deleted') {
          setBudget(null);
          setCalculations(null);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE error, reconnecting...');
      eventSource.close();
      setTimeout(() => {
        loadBudget();
      }, 3000);
    };

    return () => {
      eventSource.close();
    };
  }, [loadBudget]);

  // Create budget handler
  const handleCreateBudget = async (amount: number, period: number) => {
    const response = await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, period }),
    });
    
    const data = await response.json();
    if (data.success) {
      setBudget(data.budget);
      setCalculations(data.calculations);
      
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } else {
      throw new Error(data.error);
    }
  };

  // Add transaction handler
  const handleAddTransaction = async (amount: number, description: string) => {
    const finalAmount = transactionType === 'expense' ? -amount : amount;
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const userName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name;

    const response = await fetch('/api/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount: finalAmount, 
        description,
        userId,
        userName
      }),
    });
    
    const data = await response.json();
    if (data.success) {
      setBudget(data.budget);
      setCalculations(data.calculations);
      
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } else {
      throw new Error(data.error);
    }
  };

  // Open transaction modal
  const openModal = (type: 'expense' | 'income') => {
    setTransactionType(type);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <main className={styles.main}>
        <div className={styles.loading}>Загрузка...</div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.title}>💰 Бюджет-трекер</h1>
        
        {budget && calculations ? (
          <>
            <BudgetStatus 
              calculations={calculations} 
              createdDate={budget.createdDate} 
            />
            
            <ActionButtons 
              onAddExpense={() => openModal('expense')}
              onAddIncome={() => openModal('income')}
            />
            
            <TransactionList transactions={budget.transactions} />
            
            <TransactionModal
              isOpen={modalOpen}
              type={transactionType}
              onClose={() => setModalOpen(false)}
              onSubmit={handleAddTransaction}
            />
          </>
        ) : (
          <CreateBudget onCreateBudget={handleCreateBudget} />
        )}
      </div>
    </main>
  );
}
