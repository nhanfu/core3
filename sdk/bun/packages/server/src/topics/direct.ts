import type { TopicDefinition, TopicHandler } from './contracts.ts';
import { topicError } from './contracts.ts';

export type TopicRouter = {
  register(handler: TopicHandler): void;
  request<TRequest = unknown, TResponse = unknown>(definition: TopicDefinition<TRequest, TResponse>, payload: TRequest, timeoutMs?: number): Promise<TResponse>;
  start(): void;
  stop(): void;
};

/** Synchronous in-process implementation of the topic contract. It has no
 * event transport, subscription, or central request process. */
export class DirectTopicRouter implements TopicRouter {
  private readonly handlers = new Map<string, TopicHandler>();
  register(handler: TopicHandler): void {
    const key = `${handler.definition.topic}@${handler.definition.version}`;
    if (this.handlers.has(key)) throw new Error(`Duplicate topic handler: ${key}`);
    this.handlers.set(key, handler);
  }
  async request<TRequest, TResponse>(definition: TopicDefinition<TRequest, TResponse>, payload: TRequest, timeoutMs = 30000): Promise<TResponse> {
    const handler = this.handlers.get(`${definition.topic}@${definition.version}`);
    if (!handler) throw Object.assign(new Error(`Topic handler is unavailable: ${definition.topic}@${definition.version}`), { code: 'TOPIC_NOT_FOUND', status: 404 });
    const value = definition.request ? definition.request(payload) : payload;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Promise.resolve(handler.handle(value, { source: 'inproc', correlationId: crypto.randomUUID() })),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error(`Topic request timed out: ${definition.topic}`), { code: 'TOPIC_TIMEOUT', status: 408 })), timeoutMs); }),
      ]);
      return (definition.response ? definition.response(result) : result) as TResponse;
    } catch (error) {
      throw Object.assign(new Error(topicError(error).message), topicError(error));
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  start(): void {}
  stop(): void {}
}
