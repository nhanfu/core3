export type TopicKind = 'query' | 'command' | 'event';

export type TopicRequestEnvelope<T = unknown> = {
  kind: 'topic.request';
  topic: string;
  version: number;
  correlationId: string;
  replyTo: string;
  source: string;
  payload: T;
};

export type TopicResponseEnvelope<T = unknown> = {
  kind: 'topic.response';
  topic: string;
  version: number;
  correlationId: string;
  source: string;
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; retryable?: boolean };
};

export type TopicDefinition<TRequest = unknown, TResponse = unknown> = {
  topic: string;
  version: number;
  kind: Exclude<TopicKind, 'event'>;
  request?: (value: unknown) => TRequest;
  response?: (value: unknown) => TResponse;
};

export function topicDefinition<TRequest = unknown, TResponse = unknown>(topic: string, version = 1): TopicDefinition<TRequest, TResponse> {
  return { topic, version, kind: 'command' };
}

export type TopicHandlerContext = {
  source: string;
  correlationId: string;
};

export type TopicHandler<TRequest = unknown, TResponse = unknown> = {
  definition: TopicDefinition<TRequest, TResponse>;
  handle(payload: TRequest, context: TopicHandlerContext): Promise<TResponse> | TResponse;
};

export type TopicError = { code: string; message: string; retryable?: boolean };

export function topicError(error: unknown): TopicError {
  const value = error as { code?: unknown; message?: unknown; retryable?: unknown } | null;
  return {
    code: typeof value?.code === 'string' ? value.code : 'TOPIC_HANDLER_FAILED',
    message: String(value?.message || 'Topic handler failed'),
    ...(typeof value?.retryable === 'boolean' ? { retryable: value.retryable } : {}),
  };
}
