import express from 'express';
import cors from 'cors';
import path from 'path';
import { budgetStorage } from './storage';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes

// Get budget for user
app.get('/api/budget/:userId', (req, res) => {
  const { userId } = req.params;
  const budget = budgetStorage.getBudget(parseInt(userId));
  
  if (budget) {
    res.json({ success: true, budget });
  } else {
    res.json({ success: false, message: 'Budget not found' });
  }
});

// Set budget for user
app.post('/api/budget/:userId', (req, res) => {
  const { userId } = req.params;
  const { amount, period } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }
  
  const budgetPeriod = period || 30;
  const budget = budgetStorage.initBudget(parseInt(userId), amount, budgetPeriod);
  
  res.json({ success: true, budget });
});

// Add transaction
app.post('/api/transaction/:userId', (req, res) => {
  const { userId } = req.params;
  const { amount, description } = req.body;
  
  if (amount === undefined || amount === 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }
  
  const budget = budgetStorage.getBudget(parseInt(userId));
  if (!budget) {
    return res.status(404).json({ success: false, message: 'Budget not found' });
  }
  
  budgetStorage.addTransaction(
    parseInt(userId),
    amount,
    description || 'без описания',
    parseInt(userId),
    'User'
  );
  
  const updatedBudget = budgetStorage.getBudget(parseInt(userId));
  res.json({ success: true, budget: updatedBudget });
});

// Reset transactions
app.post('/api/budget/:userId/reset', (req, res) => {
  const { userId } = req.params;
  const count = budgetStorage.resetTransactions(parseInt(userId));
  
  res.json({ success: true, deletedCount: count });
});

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Mini App server running on http://localhost:${PORT}`);
  console.log(`🌐 Server accessible on all network interfaces`);
  console.log(`📱 Open in Telegram: https://t.me/YOUR_BOT_USERNAME/app`);
});

export default app;
