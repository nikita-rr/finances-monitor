import express from 'express';
import cors from 'cors';
import path from 'path';
import { budgetStorage } from './storage';
import { updatePinnedMessageFromAPI } from './bot';

const app = express();
const PORT = process.env.PORT || 3000;

// Store SSE clients
const sseClients: express.Response[] = [];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Subscribe to budget changes
budgetStorage.onChange((budget) => {
  console.log('Budget changed, notifying', sseClients.length, 'SSE clients');
  // Notify all connected SSE clients
  sseClients.forEach((client) => {
    try {
      client.write(`data: ${JSON.stringify({ type: 'budget-update', budget })}\n\n`);
    } catch (error) {
      console.error('Error sending SSE to client:', error);
    }
  });
});

// API Routes

// SSE endpoint for real-time updates
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Add client to the list
  sseClients.push(res);
  console.log('New SSE client connected. Total clients:', sseClients.length);

  // Send initial budget data
  const budget = budgetStorage.getBudget();
  res.write(`data: ${JSON.stringify({ type: 'connected', budget })}\n\n`);

  // Remove client on disconnect
  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
      console.log('SSE client disconnected. Total clients:', sseClients.length);
    }
  });
});

// Get shared budget
app.get('/api/budget', (req, res) => {
  const budget = budgetStorage.getBudget();
  
  if (budget) {
    res.json({ success: true, budget });
  } else {
    res.json({ success: false, message: 'Budget not found' });
  }
});

// Set shared budget
app.post('/api/budget', (req, res) => {
  const { amount, period } = req.body;
  
  if (!amount || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }
  
  const budgetPeriod = period || 30;
  const budget = budgetStorage.initBudget(amount, budgetPeriod);
  
  // Update pinned message if exists
  updatePinnedMessageFromAPI().catch(err => 
    console.error('Failed to update pinned message:', err)
  );
  
  res.json({ success: true, budget });
});

// Add transaction to shared budget
app.post('/api/transaction', (req, res) => {
  const { amount, description, userId, userName } = req.body;
  
  if (amount === undefined || amount === 0) {
    return res.status(400).json({ success: false, message: 'Invalid amount' });
  }
  
  const budget = budgetStorage.getBudget();
  if (!budget) {
    return res.status(404).json({ success: false, message: 'Budget not found' });
  }
  
  budgetStorage.addTransaction(
    amount,
    description || 'без описания',
    userId || 0,
    userName || 'User'
  );
  
  // Update pinned message if exists
  updatePinnedMessageFromAPI().catch(err => 
    console.error('Failed to update pinned message:', err)
  );
  
  const updatedBudget = budgetStorage.getBudget();
  res.json({ success: true, budget: updatedBudget });
});

// Reset transactions
app.post('/api/budget/reset', (req, res) => {
  const count = budgetStorage.resetTransactions();
  
  // Update pinned message if exists
  updatePinnedMessageFromAPI().catch(err => 
    console.error('Failed to update pinned message:', err)
  );
  
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
