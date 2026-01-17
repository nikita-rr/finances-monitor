// Event emitter for real-time updates
type EventCallback = (data: any) => void;

class BudgetEventEmitter {
  private subscribers: Set<EventCallback> = new Set();

  subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  emit(data: any): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event subscriber:', error);
      }
    });
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }
}

export const budgetEvents = new BudgetEventEmitter();
