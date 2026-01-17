// Telegram WebApp API initialization
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Apply Telegram theme
document.documentElement.style.setProperty(
  "--tg-theme-bg-color",
  tg.themeParams.bg_color || "#ffffff"
);
document.documentElement.style.setProperty(
  "--tg-theme-text-color",
  tg.themeParams.text_color || "#000000"
);
document.documentElement.style.setProperty(
  "--tg-theme-hint-color",
  tg.themeParams.hint_color || "#999999"
);
document.documentElement.style.setProperty(
  "--tg-theme-button-color",
  tg.themeParams.button_color || "#2481cc"
);
document.documentElement.style.setProperty(
  "--tg-theme-button-text-color",
  tg.themeParams.button_text_color || "#ffffff"
);
document.documentElement.style.setProperty(
  "--tg-theme-secondary-bg-color",
  tg.themeParams.secondary_bg_color || "#f4f4f5"
);

// API base URL
const API_URL = window.location.origin;

// Get user ID from Telegram (not needed for shared budget, but keep for compatibility)
const userId = tg.initDataUnsafe?.user?.id || 0;

// State
let currentTransactionType = "expense";
let budget = null;
let eventSource = null;

// Setup real-time updates via SSE
function setupRealtimeUpdates() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(`${API_URL}/api/events`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'connected') {
        console.log('SSE connected');
        if (data.budget) {
          budget = data.budget;
          renderBudgetStatus();
          renderTransactions();
          setBudgetCard.style.display = "none";
        }
      } else if (data.type === 'budget-update') {
        console.log('Budget updated from server');
        if (data.budget) {
          budget = data.budget;
          renderBudgetStatus();
          renderTransactions();
          setBudgetCard.style.display = "none";
        }
      }
    } catch (error) {
      console.error('Error parsing SSE message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    // Reconnect after 3 seconds
    setTimeout(() => {
      console.log('Reconnecting SSE...');
      setupRealtimeUpdates();
    }, 3000);
  };
}

// Elements
const statusCard = document.getElementById("statusCard");
const setBudgetCard = document.getElementById("setBudgetCard");
const transactionModal = document.getElementById("transactionModal");
const modalTitle = document.getElementById("modalTitle");
const addExpenseBtn = document.getElementById("addExpenseBtn");
const addIncomeBtn = document.getElementById("addIncomeBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const setBudgetBtn = document.getElementById("setBudgetBtn");
const submitTransactionBtn = document.getElementById("submitTransactionBtn");
const transactionsList = document.getElementById("transactionsList");

// Event Listeners
addExpenseBtn.addEventListener("click", () => openTransactionModal("expense"));
addIncomeBtn.addEventListener("click", () => openTransactionModal("income"));
closeModalBtn.addEventListener("click", closeTransactionModal);
setBudgetBtn.addEventListener("click", setBudget);
submitTransactionBtn.addEventListener("click", submitTransaction);

// Initialize
loadBudget();
setupRealtimeUpdates();

// Auto-update UI when date changes
let lastRenderedDate = new Date().toDateString();

// Check every 30 seconds if date has changed
const dayChangeCheckInterval = setInterval(() => {
  const currentDate = new Date().toDateString();
  if (currentDate !== lastRenderedDate && budget) {
    console.log(`[${new Date().toLocaleTimeString()}] Day changed from ${lastRenderedDate} to ${currentDate}, updating UI`);
    lastRenderedDate = currentDate;
    renderBudgetStatus();
    renderTransactions();
  }
}, 30000); // Check every 30 seconds

// Also schedule precise update at midnight
function scheduleNextMidnightUpdate() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 100); // 100ms after midnight
  
  const timeUntilMidnight = tomorrow.getTime() - now.getTime();
  console.log(`[${new Date().toLocaleTimeString()}] Next midnight update scheduled in ${(timeUntilMidnight / 1000 / 60).toFixed(1)} minutes`);
  
  setTimeout(() => {
    if (budget) {
      console.log(`[${new Date().toLocaleTimeString()}] Midnight update triggered`);
      lastRenderedDate = new Date().toDateString();
      renderBudgetStatus();
      renderTransactions();
    }
    scheduleNextMidnightUpdate();
  }, timeUntilMidnight);
}

scheduleNextMidnightUpdate();

// Functions
async function loadBudget() {
  try {
    const response = await fetch(`${API_URL}/api/budget`);
    const data = await response.json();

    if (data.success && data.budget) {
      budget = data.budget;
      renderBudgetStatus();
      renderTransactions();
      setBudgetCard.style.display = "none";
    } else {
      statusCard.innerHTML = `
                <div class="status-content">
                    <p style="text-align: center; padding: 20px;">
                        Бюджет не установлен.<br>
                        Установите бюджет ниже ⬇️
                    </p>
                </div>
            `;
      setBudgetCard.style.display = "block";
    }
  } catch (error) {
    console.error("Error loading budget:", error);
    tg.showAlert("Ошибка загрузки данных");
  }
}

function renderBudgetStatus() {
  if (!budget) return;

  // Update the last rendered date when we re-render
  lastRenderedDate = new Date().toDateString();

  const period = budget.period || 30;
  const total = budget.transactions.reduce((sum, t) => sum + t.amount, 0);
  const remaining = budget.monthlyBudget + total;

  // Calculate today's transactions
  const now = new Date();
  const today = now.toDateString();
  let todayNet = 0;
  let todayExpenses = 0;

  budget.transactions.forEach((t) => {
    const tDate = new Date(t.date);
    if (tDate.toDateString() === today) {
      todayNet += t.amount;
      if (t.amount < 0) {
        todayExpenses += Math.abs(t.amount);
      }
    }
  });

  const remainingWithoutToday = remaining - todayNet;
  const dailyBudget = remainingWithoutToday / period;

  // Calculate days passed (using calendar days, not time-based)
  const createdDate = new Date(budget.createdDate);
  const createdDateOnly = new Date(createdDate);
  createdDateOnly.setHours(0, 0, 0, 0);
  
  const todayDateOnly = new Date(now);
  todayDateOnly.setHours(0, 0, 0, 0);
  
  const daysPassed =
    Math.floor((todayDateOnly - createdDateOnly) / (1000 * 60 * 60 * 24)) + 1;
  const currentDay = Math.min(daysPassed, period);

  // Calculate savings
  const completedDays = currentDay - 1;
  const planedSpentCompleted = (budget.monthlyBudget / period) * completedDays;
  const planedRemainingCompleted = budget.monthlyBudget - planedSpentCompleted;
  const saved = remainingWithoutToday - planedRemainingCompleted;

  // Today's balance from daily budget
  const todayBalance = dailyBudget - todayExpenses;
  // Total can spend today (including saved)
  const canSpendToday = dailyBudget + (saved > 0 ? saved : 0);

  // Calculate totals
  let totalExpenses = 0;
  let totalIncome = 0;
  budget.transactions.forEach((t) => {
    if (t.amount < 0) {
      totalExpenses += Math.abs(t.amount);
    } else {
      totalIncome += t.amount;
    }
  });

  // Warnings
  let warningHtml = "";
  let savedHtml = "";

  // Check overspend today - based on absolute expenses, not net spend
  const overspendToday = Math.max(0, todayExpenses - dailyBudget);

  if (overspendToday > 0) {
    warningHtml += `<div class="warning">⚠️ Перерасход сегодня на: ${overspendToday.toFixed(
      2
    )} руб.</div>`;
  }

  // Future limit warning
  const daysLeft = period - currentDay;
  if (daysLeft > 0 && todayNet !== 0) {
    const futureDailyBudget = remaining / daysLeft;
    const currentBaseDailyBudget = remainingWithoutToday / period;
    const limitChange = currentBaseDailyBudget - futureDailyBudget;

    if (Math.abs(limitChange) > 0.01) {
      if (limitChange > 0) {
        warningHtml += `<div class="warning">📉 Дневной лимит с завтра уменьшится на: ${limitChange.toFixed(
          2
        )} руб. (будет ${futureDailyBudget.toFixed(2)} руб.)</div>`;
      } else {
        savedHtml += `<div class="saved-info">📈 Дневной лимит с завтра увеличится на: ${Math.abs(
          limitChange
        ).toFixed(2)} руб. (будет ${futureDailyBudget.toFixed(2)} руб.)</div>`;
      }
    }
  }

  // Show savings
  if (completedDays > 0) {
    if (saved > 0) {
      savedHtml += `<div class="saved-info">👌 Сэкономлено: ${saved.toFixed(
        2
      )} руб.</div>`;
    } else if (saved < 0) {
      warningHtml += `<div class="warning">⚠️ Перерасход: ${Math.abs(
        saved
      ).toFixed(2)} руб.</div>`;
    }
  }

  statusCard.innerHTML = `
        <div class="status-content">
            <div class="status-row">
                <span class="status-label">📅 Дата создания:</span>
                <span class="status-value">${new Date(budget.createdDate).toLocaleDateString("ru-RU")}</span>
            </div>
            <div class="status-row">
                <span class="status-label">📅 Период:</span>
                <span class="status-value">${currentDay}/${period}</span>
            </div>
            <div class="status-row">
                <span class="status-label">💰 Бюджет:</span>
                <span class="status-value">${budget.monthlyBudget.toFixed(
                  2
                )} ₽</span>
            </div>
            <div class="status-row">
                <span class="status-label">✅ Остаток:</span>
                <span class="status-value">${remaining.toFixed(2)} ₽</span>
            </div>
            <div class="status-row">
                <span class="status-label">💸 Траты:</span>
                <span class="status-value">-${totalExpenses.toFixed(2)} ₽</span>
            </div>
            <div class="status-row">
                <span class="status-label">💵 Пополнения:</span>
                <span class="status-value">+${totalIncome.toFixed(2)} ₽</span>
            </div>
            <div class="status-row">
                <span class="status-label">📈 Дневной лимит</span>
                <span class="status-value">${dailyBudget.toFixed(2)} ₽</span>
            </div>
            <div class="status-row">
                <span class="status-label">💎 Всего можно потратить</span>
                <span class="status-value">${canSpendToday.toFixed(2)} ₽</span>
            </div>
            <div class="daily-limit">
                <div class="daily-limit-label">📅 Баланс сегодня:</div>
                <div class="daily-limit-value">
                ${ todayBalance >= 0 ? "+" : "" }
                ${todayBalance.toFixed(2)} ₽
                </div>
            </div>
            ${warningHtml}
            ${savedHtml}
        </div>
    `;
}

function renderTransactions() {
  if (!budget || !budget.transactions || budget.transactions.length === 0) {
    transactionsList.innerHTML = '<p class="empty-state">Нет транзакций</p>';
    return;
  }

  const recentTransactions = budget.transactions.slice(-10).reverse();

  transactionsList.innerHTML = recentTransactions
    .map((t) => {
      const date = new Date(t.date);
      const isExpense = t.amount < 0;
      const amountClass = isExpense ? "expense" : "income";
      const sign = isExpense ? "-" : "+";

      return `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-description">${t.description}</div>
                    <div class="transaction-date">${date.toLocaleDateString(
                      "ru-RU"
                    )} ${date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      })}</div>
                </div>
                <div class="transaction-amount ${amountClass}">
                    ${sign}${Math.abs(t.amount).toFixed(2)} ₽
                </div>
            </div>
        `;
    })
    .join("");
}

function openTransactionModal(type) {
  currentTransactionType = type;
  modalTitle.textContent =
    type === "expense" ? "➖ Добавить расход" : "➕ Добавить доход";
  transactionModal.classList.add("active");
  document.getElementById("transactionAmount").value = "";
  document.getElementById("transactionDescription").value = "";
  document.getElementById("transactionAmount").focus();
}

function closeTransactionModal() {
  transactionModal.classList.remove("active");
}

async function setBudget() {
  const amount = parseFloat(document.getElementById("budgetAmount").value);
  const period = parseInt(document.getElementById("budgetPeriod").value);

  if (!amount || amount <= 0) {
    tg.showAlert("Введите корректную сумму бюджета");
    return;
  }

  if (!period || period <= 0 || period > 365) {
    tg.showAlert("Период должен быть от 1 до 365 дней");
    return;
  }

  try {
    tg.MainButton.showProgress();

    const response = await fetch(`${API_URL}/api/budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, period }),
    });

    const data = await response.json();

    if (data.success) {
      tg.showAlert(
        `✅ Бюджет установлен на ${amount.toFixed(2)} руб. на ${period} дней`
      );
      await loadBudget();
    } else {
      tg.showAlert("Ошибка при установке бюджета");
    }
  } catch (error) {
    console.error("Error setting budget:", error);
    tg.showAlert("Ошибка при установке бюджета");
  } finally {
    tg.MainButton.hideProgress();
  }
}

async function submitTransaction() {
  const amount = parseFloat(document.getElementById("transactionAmount").value);
  const description =
    document.getElementById("transactionDescription").value || "без описания";

  if (!amount || amount <= 0) {
    tg.showAlert("Введите корректную сумму");
    return;
  }

  const finalAmount = currentTransactionType === "expense" ? -amount : amount;

  try {
    tg.MainButton.showProgress();

    const response = await fetch(`${API_URL}/api/transaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: finalAmount,
        description,
        userId,
        userName: tg.initDataUnsafe?.user?.first_name || "User",
      }),
    });

    const data = await response.json();

    if (data.success) {
      closeTransactionModal();
      await loadBudget();
      tg.HapticFeedback.notificationOccurred("success");
    } else {
      tg.showAlert("Ошибка при добавлении транзакции");
    }
  } catch (error) {
    console.error("Error adding transaction:", error);
    tg.showAlert("Ошибка при добавлении транзакции");
  } finally {
    tg.MainButton.hideProgress();
  }
}

// Close modal on background click
transactionModal.addEventListener("click", (e) => {
  if (e.target === transactionModal) {
    closeTransactionModal();
  }
});
