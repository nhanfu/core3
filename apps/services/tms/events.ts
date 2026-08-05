import type { TmsRouteContext } from './api-route-context.ts';
import type { TmsEventStore } from './event-store.ts';

function findStream(pages: Map<string, any>, pathname: string): any {
  const visit = (components: any[] = []): any => {
    for (const component of components) {
      if (component.sse?.endpoint === pathname) return component.sse;
      const nested = visit((component.tabs || []).flatMap((tab: any) => tab.components || []));
      if (nested) return nested;
    }
    return null;
  };
  for (const page of pages.values()) {
    const stream = visit(page.components);
    if (stream) return stream;
  }
  return null;
}

export async function handleEventRoutes(ctx: TmsRouteContext): Promise<Response | null> {
  const { pathname, method, PAGES, authUser, requirePerm, CORS_HEADERS, eventStore } = ctx;
  if (method !== 'GET' || !pathname.startsWith('/api/events/')) return null;
  const stream = findStream(PAGES, pathname);
  if (!stream) return null;
  requirePerm(String(stream.permission || ''));

  let closed = false;
  let unsubscribe = () => {};
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(': connected\n\n'));
      const sendAck = (event: any) => {
        if (closed) return;
        const payload = {
          type: 'chat_ack',
          status: event.status,
          operation: event.operation,
          client_message_id: event.clientMessageId,
          message_id: event.messageId,
          thread_id: event.threadId,
          error: event.error,
        };
        controller.enqueue(encoder.encode(`event: chat_ack\ndata: ${JSON.stringify(payload)}\n\n`));
      };
      const sendMessage = (event: any) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: chat_message\ndata: ${JSON.stringify({
          type: 'chat_message',
          message: event.message,
        })}\n\n`));
      };
      unsubscribe = (eventStore as TmsEventStore).subscribe((event) => {
        if (event.actorId === String(authUser.sub || '')) sendAck(event);
        else if (event.message) sendMessage(event);
      });
    },
    cancel() {
      closed = true;
      unsubscribe();
    },
  });
  return new Response(body, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      Connection: 'keep-alive',
    },
  });
}
