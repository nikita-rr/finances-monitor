import { NextRequest, NextResponse } from 'next/server';
import { getBudget, createBudget } from '@/lib/storage';
import { calculateBudgetStats } from '@/lib/calculations';
import { sendBudgetMessage } from '@/lib/telegram';

export async function GET() {
  const budget = getBudget();
  
  if (!budget) {
    return NextResponse.json({
      success: false,
      error: 'Budget not found'
    });
  }

  const calculations = calculateBudgetStats(budget);
  
  return NextResponse.json({
    success: true,
    budget,
    calculations
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, period = 14, chatId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid amount'
      }, { status: 400 });
    }

    if (period <= 0 || period > 365) {
      return NextResponse.json({
        success: false,
        error: 'Period must be between 1 and 365 days'
      }, { status: 400 });
    }

    // Проверяем, есть ли уже бюджет
    const existingBudget = getBudget();
    if (existingBudget) {
      return NextResponse.json({
        success: false,
        error: 'Budget already exists. Delete it first.'
      }, { status: 400 });
    }

    const budget = createBudget(amount, period, chatId);
    const calculations = calculateBudgetStats(budget);

    // Отправляем сообщение в Telegram если есть chatId
    if (chatId) {
      await sendBudgetMessage(chatId);
    }

    return NextResponse.json({
      success: true,
      budget,
      calculations
    });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE() {
  const { deleteBudget } = await import('@/lib/storage');
  
  deleteBudget();
  
  return NextResponse.json({
    success: true
  });
}
