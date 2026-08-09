import type { ModuleServer } from '../../lib/server/module.ts';
import type { EventStore } from '../../lib/server/event-store.ts';
import type { TmsRouteContext } from './api-route-context.ts';
import { decodeChatFrame, encodeChatFrame } from '../../lib/server/chat-wire.ts';

type Socket = { send(data: string | Uint8Array): void; close(code?: number, reason?: string): void };

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
        socket.send(encodeChatFrame({ type: 'connected' }));
        const subscription = store.subscribeStream();
        void (async () => {
          for await (const event of subscription.events) {
            if (event.actorId === String(authUser.sub || '')) {
              socket.send(encodeChatFrame({
                type: 'chat_ack',
                status: event.status,
                operation: event.operation,
                client_message_id: event.clientMessageId,
                message_id: event.messageId,
                thread_id: event.threadId,
                error: event.error,
              }));
            } else if (event.message) {
              socket.send(encodeChatFrame({ type: 'chat_message', message: event.message }));
            }
          }
        })();
        (socket as any).__eventUnsubscribe = subscription.close;
      },
      async onMessage(socket: Socket, raw: string | ArrayBuffer) {
        let payload: any;
        try { payload = decodeChatFrame(typeof raw === 'string' ? new TextEncoder().encode(raw) : raw); } catch {
          socket.send(encodeChatFrame({ type: 'chat_error', error: 'Invalid binary message' }));
          return;
        }
        if (payload?.type !== 'send_message') return;
        if (typeof executeAction !== 'function') {
          socket.send(encodeChatFrame({ type: 'chat_error', error: 'Chat action handler is unavailable' }));
          return;
        }
        try {
          const response = await executeAction({
            id: payload.thread_id,
            content: payload.content,
            client_message_id: payload.client_message_id,
          });
        } catch (error: any) {
          socket.send(encodeChatFrame({ type: 'chat_error', error: String(error?.message || 'Message failed') }));
        }
      },
      onClose(socket: Socket) {
        (socket as any).__eventUnsubscribe?.();
      },
    },
  });
  return upgraded ? undefined : new Response('WebSocket upgrade failed', { status: 400 });
}
