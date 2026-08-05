export type ChatQueueEvent = {
  sequence: number;
  operation: string;
  status: 'success' | 'failed';
  actorId?: string;
  clientMessageId?: string;
  messageId?: string;
  message?: Record<string, any>;
  error?: string;
  threadId?: string;
  at: number;
};

type Listener = (event: ChatQueueEvent) => void;

class InMemoryMessageQueue {
  private sequence = 0;
  private readonly history: ChatQueueEvent[] = [];
  private readonly listeners = new Set<Listener>();

  publish(event: Omit<ChatQueueEvent, 'sequence' | 'at'>) {
    const item = { ...event, sequence: ++this.sequence, at: Date.now() };
    this.history.push(item);
    if (this.history.length > 1000) this.history.shift();
    for (const listener of this.listeners) listener(item);
    return item;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const chatMessageQueue = new InMemoryMessageQueue();
