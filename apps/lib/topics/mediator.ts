import { v7 as uuidv7 } from 'uuid';
import type { EventEnvelope, EventSubscription } from '../server/event-store.ts';
import { topicError, type TopicDefinition, type TopicHandler, type TopicRequestEnvelope, type TopicResponseEnvelope } from './contracts.ts';

export class TopicMediator {
  private readonly handlers = new Map<string, TopicHandler>();
  private readonly running = new Set<string>();

  constructor(
    private readonly transport: TopicTransport,
    private readonly source: string,
  ) {}

  register<TRequest, TResponse>(handler: TopicHandler<TRequest, TResponse>): void {
    const key = `${handler.definition.topic}@${handler.definition.version}`;
    if (this.handlers.has(key)) throw new Error(`Duplicate topic handler: ${key}`);
    this.handlers.set(key, handler as TopicHandler);
  }

  async request<TRequest, TResponse>(
    definition: TopicDefinition<TRequest, TResponse>,
    payload: TRequest,
    timeoutMs = 30000,
  ): Promise<TResponse> {
    const correlationId = uuidv7();
    const replyTo = `rpc.response.${this.source}.${correlationId}`;
    const subscription = this.transport.subscribeStream({ topic: replyTo, maxEvents: 10, maxWaitMs: Math.min(timeoutMs, 1000) });
    const result = this.waitForResponse<TResponse>(subscription, correlationId, timeoutMs);
    await this.transport.publish({
      topic: `rpc.request.${definition.topic}`,
      kind: 'topic.request',
      topicName: definition.topic,
      version: definition.version,
      correlationId,
      replyTo,
      source: this.source,
      payload,
    });
    return result.finally(() => subscription.close());
  }

  start(): void {
    for (const [key, handler] of this.handlers) {
      if (this.running.has(key)) continue;
      this.running.add(key);
      void this.consume(key, handler);
    }
  }

  stop(): void {
    this.running.clear();
  }

  private async consume(key: string, handler: TopicHandler): Promise<void> {
    const subscription = this.transport.subscribeStream({
      topic: `rpc.request.${handler.definition.topic}`,
      group: `topic-handler:${this.source}:${key}`,
      maxEvents: 25,
      maxWaitMs: 1000,
    });
    try {
      for await (const event of subscription.events) {
        const request = event as unknown as TopicRequestEnvelope;
        if (request.kind !== 'topic.request' || request.topicName !== handler.definition.topic || Number(request.version) !== handler.definition.version) {
          if (event.sequence && subscription.ack) await subscription.ack(event.sequence);
          continue;
        }
        try {
          const payload = handler.definition.request ? handler.definition.request(request.payload) : request.payload;
          const data = await handler.handle(payload, { source: String(request.source || ''), correlationId: request.correlationId });
          await this.transport.publish({
            topic: request.replyTo,
            kind: 'topic.response',
            topicName: handler.definition.topic,
            version: handler.definition.version,
            correlationId: request.correlationId,
            source: this.source,
            ok: true,
            data,
          } as any);
        } catch (error) {
          await this.transport.publish({
            topic: request.replyTo,
            kind: 'topic.response',
            topicName: handler.definition.topic,
            version: handler.definition.version,
            correlationId: request.correlationId,
            source: this.source,
            ok: false,
            error: topicError(error),
          } as any);
        } finally {
          if (event.sequence && subscription.ack) await subscription.ack(event.sequence);
        }
      }
    } finally {
      subscription.close();
      this.running.delete(key);
    }
  }

  private async waitForResponse<T>(subscription: EventSubscription, correlationId: string, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async () => {
          for await (const event of subscription.events) {
            const response = event as unknown as TopicResponseEnvelope<T>;
            if (response.kind !== 'topic.response' || response.correlationId !== correlationId) continue;
            if (response.ok) return response.data as T;
            throw Object.assign(new Error(response.error?.message || 'Topic request failed'), response.error || {});
          }
          throw new Error('Topic response stream closed');
        })(),
        new Promise<T>((_, reject) => { timer = setTimeout(() => reject(new Error(`Topic request timed out: ${correlationId}`)), timeoutMs); }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

export type TopicTransport = {
  publish(event: Omit<EventEnvelope, 'id' | 'sequence' | 'at'>): Promise<EventEnvelope>;
  subscribeStream(options: { topic?: string; group?: string; maxEvents?: number; maxWaitMs?: number }): EventSubscription;
};
