import { NextRequest, NextResponse } from 'next/server';
import { getBot, initBot } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const bot = getBot() || initBot();
    
    if (!bot) {
      return NextResponse.json({ error: 'Bot not initialized' }, { status: 500 });
    }

    const body = await request.json();
    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error handling telegram update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  // Health check для webhook
  return NextResponse.json({ status: 'ok' });
}
