import { NextRequest, NextResponse } from 'next/server';
import { addTransaction, getBudget } from '@/lib/storage';
import { calculateBudgetStats } from '@/lib/calculations';
import { notifyBudgetUpdate } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description = 'Без описания', userId, userName } = body;

    if (amount === undefined || amount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid amount'
      }, { status: 400 });
    }

    const budget = getBudget();
    if (!budget) {
      return NextResponse.json({
        success: false,
        error: 'Budget not found'
      }, { status: 404 });
    }

    const transaction = addTransaction(amount, description, userId, userName);
    
    if (!transaction) {
      return NextResponse.json({
        success: false,
        error: 'Failed to add transaction'
      }, { status: 500 });
    }

    // Обновляем сообщение в Telegram
    await notifyBudgetUpdate();

    const updatedBudget = getBudget();
    const calculations = updatedBudget ? calculateBudgetStats(updatedBudget) : null;

    return NextResponse.json({
      success: true,
      transaction,
      budget: updatedBudget,
      calculations
    });
  } catch (error) {
    console.error('Error adding transaction:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
