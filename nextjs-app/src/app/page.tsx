'use client';

import { useState, useEffect, useCallback } from 'react';
import { Budget, BudgetCalculations } from '@/types';
import { 
  BudgetStatus, 
  CreateBudget, 
  TransactionList, 
  TransactionModal,
  ActionButtons,
  DayNavigator,
  TodayBalance
} from '@/components';
import styles from './page.module.css';

// Declare Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        initData: string;
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
    const root = document.documentElement;
    
    // Check if we're actually inside Telegram (not just script loaded)
    const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
    const isInTelegram = tg && tg.initData && tg.initData.length > 0;
    
    if (isInTelegram) {
      tg.ready();
      tg.expand();

      // Apply theme from Telegram
      const bgColor = tg.themeParams.bg_color || '#ffffff';
      root.style.setProperty('--tg-theme-bg-color', bgColor);
      root.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
      root.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
      root.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
      root.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
      root.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f4f4f5');
      
      // Detect if Telegram is using dark theme by checking bg_color luminance
      const isDark = isDarkColor(bgColor);
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    } else {
      // Not in Telegram - use browser's preferred color scheme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
      
      // Listen for system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (e.matches) {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      });
    }
  }, []);
  
  // Helper function to detect if a color is dark
  function isDarkColor(color: string): boolean {
    // Convert hex to RGB
    let r = 0, g = 0, b = 0;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    }
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

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
        
        if (data.type === 'connected' || data.type === 'update') {
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
  const handleAddTransaction = async (amount: number, description: string, receiptBase64s?: string[], receiptNames?: string[]) => {
    const finalAmount = transactionType === 'expense' ? -amount : amount;
    const userId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    const userName = window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name;

    const body: any = {
      amount: finalAmount,
      description,
      userId,
      userName,
    };

    if (receiptBase64s && receiptBase64s.length > 0) {
      body.receiptBase64s = receiptBase64s;
      body.receiptOriginalNames = receiptNames;
    }

    const response = await fetch('/api/transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
        {budget && calculations ? (
          <>
            <TodayBalance calculations={calculations} />
            
            <DayNavigator
              createdDate={budget.createdDate}
              periodDays={budget.periodDays}
              transactions={budget.transactions}
              totalBudget={budget.totalBudget}
              plannedDailyBudget={calculations.plannedDailyBudget}
            />
            
            <BudgetStatus 
              calculations={calculations} 
              createdDate={budget.createdDate} 
            />
            
            <TransactionList transactions={budget.transactions} />
            
            <ActionButtons 
              onAddExpense={() => openModal('expense')}
              onAddIncome={() => openModal('income')}
            />
            
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
