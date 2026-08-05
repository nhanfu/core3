import type { TmsRouteContext } from './api-route-context.ts';

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
  const { pathname, method, PAGES, SOURCES, repository, authProvider, authUser, requirePerm, CORS_HEADERS } = ctx;
  if (method !== 'GET' || !pathname.startsWith('/api/events/')) return null;
  const stream = findStream(PAGES, pathname);
  if (!stream) return null;
  requirePerm(String(stream.permission || ''));

  const interval = Math.max(1000, Number(stream.interval_ms || 5000));
  const sourceIds = Array.isArray(stream.sources) ? stream.sources.map(String) : [];
  const params = {
    current_user_id: String(authUser.sub || ''),
    current_user_name: String(authUser.name || ''),
    current_branch_id: String(authUser.branch_id || ''),
    view_scope: String(authUser.view_scope || 'all'),
  };
  const snapshot = async () => {
    const sources: Record<string, any> = {};
    for (const sourceId of sourceIds) {
      const source = SOURCES.get(sourceId);
      if (!source) continue;
      if (source.permission && !authProvider.hasPermission(authUser, source.permission)) continue;
      sources[sourceId] = await repository.querySource(source, params, 0, Number(stream.top || 1000));
    }
    return { sources };
  };
  let timer: ReturnType<typeof setInterval> | null = null;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = async () => {
        try {
          const payload = await snapshot();
          controller.enqueue(encoder.encode(`event: ${stream.event || 'refresh'}\ndata: ${JSON.stringify(payload)}\n\n`));
        } catch {
          controller.enqueue(encoder.encode('event: error\ndata: {}\n\n'));
        }
      };
      void send();
      timer = setInterval(() => void send(), interval);
    },
    cancel() {
      if (timer) clearInterval(timer);
      timer = null;
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
