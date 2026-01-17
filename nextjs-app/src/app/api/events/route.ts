import { NextRequest, NextResponse } from 'next/server';
import { getBudget } from '@/lib/storage';
import { calculateBudgetStats } from '@/lib/calculations';
import { budgetEvents } from '@/lib/events';

// Force dynamic rendering for SSE endpoint
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial data
      const budget = getBudget();
      if (budget) {
        const calculations = calculateBudgetStats(budget);
        const data = JSON.stringify({
          type: 'connected',
          budget,
          calculations
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      } else {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));
      }

      // Subscribe to budget updates
      const unsubscribe = budgetEvents.subscribe((eventData) => {
        try {
          const data = JSON.stringify({
            type: 'update',
            ...eventData
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          console.error('Error sending SSE update:', error);
        }
      });

      // Keep connection alive with periodic pings
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(pingInterval);
          unsubscribe();
        }
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        unsubscribe();
      });
    },
    cancel() {
      // Handle stream cancellation
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
