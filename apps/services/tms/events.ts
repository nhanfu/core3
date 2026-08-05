import type { ModuleServer } from '../../lib/server/module.ts';
import type { EventStore } from '../../lib/server/event-store.ts';
import type { TmsRouteContext } from './api-route-context.ts';

type Socket = { send(data: string): void; close(code?: number, reason?: string): void };

function findStream(pages: Map<string, any>, pathname: string): any {
  const visit = (components: any[] = []) => {
    for (const component of components) {
      if (component.websocket?.endpoint === pathname) return component.websocket;
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

export async function handleEventRoutes(ctx: TmsRouteContext, server?: ModuleServer): Promise<Response | null | undefined> {
  const { req, pathname, method, PAGES, authUser, requirePerm, eventStore, executeAction } = ctx;
  if (method !== 'GET' || !pathname.startsWith('/api/events/')) return null;
  const stream = findStream(PAGES, pathname);
  if (!stream) return null;
  requirePerm(String(stream.permission || ''));
  if (!server) return new Response('WebSocket upgrade is required', { status: 426 });

  const store = eventStore as EventStore;
  const upgraded = server.upgrade(req, {
    data: {
      onOpen(socket: Socket) {
        socket.send(JSON.stringify({ type: 'connected' }));
        const unsubscribe = store.subscribe((event) => {
          if (event.actorId === String(authUser.sub || '')) {
            socket.send(JSON.stringify({
              type: 'chat_ack',
              status: event.status,
              operation: event.operation,
              client_message_id: event.clientMessageId,
              message_id: event.messageId,
              thread_id: event.threadId,
              error: event.error,
            }));
          } else if (event.message) {
            socket.send(JSON.stringify({ type: 'chat_message', message: event.message }));
          }
        });
        (socket as any).__eventUnsubscribe = unsubscribe;
      },
      async onMessage(socket: Socket, raw: string | ArrayBuffer) {
        let payload: any;
        try { payload = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)); } catch {
          socket.send(JSON.stringify({ type: 'chat_error', message: 'Invalid WebSocket message' }));
          return;
        }
        if (payload?.type !== 'send_message') return;
        if (typeof executeAction !== 'function') {
          socket.send(JSON.stringify({ type: 'chat_error', message: 'Chat action handler is unavailable' }));
          return;
        }
        try {
          const response = await executeAction({
            id: payload.thread_id,
            content: payload.content,
            client_message_id: payload.client_message_id,
          });
        } catch (error: any) {
          socket.send(JSON.stringify({ type: 'chat_error', message: String(error?.message || 'Message failed') }));
        }
      },
      onClose(socket: Socket) {
        (socket as any).__eventUnsubscribe?.();
      },
    },
  });
  return upgraded ? undefined : new Response('WebSocket upgrade failed', { status: 400 });
}
