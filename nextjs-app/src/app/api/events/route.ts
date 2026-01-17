import { NextRequest, NextResponse } from 'next/server';
import { getBudget } from '@/lib/storage';
import { calculateBudgetStats } from '@/lib/calculations';

// Store SSE clients
const clients = new Set<ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);
      
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

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clients.delete(controller);
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

// Function to broadcast updates to all connected clients
export function broadcastUpdate() {
  const budget = getBudget();
  const encoder = new TextEncoder();
  
  let data;
  if (budget) {
    const calculations = calculateBudgetStats(budget);
    data = JSON.stringify({
      type: 'budget-update',
      budget,
      calculations
    });
  } else {
    data = JSON.stringify({
      type: 'budget-deleted'
    });
  }

  clients.forEach((client) => {
    try {
      client.enqueue(encoder.encode(`data: ${data}\n\n`));
    } catch (error) {
      clients.delete(client);
    }
  });
}
