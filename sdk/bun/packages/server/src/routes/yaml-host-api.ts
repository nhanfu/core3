import type { ModuleServer } from '../module.ts';
import type { YamlRuntimeContext } from '@core3/server/yaml-service';
import { translationMap } from '@core3/server/discovery';
import { requestLanguage } from '@core3/server/locale';

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function hasWebsocketEndpoint(page: any, pathname: string): boolean {
  const visit = (value: any): boolean => {
    if (!value || typeof value !== 'object') return false;
    if (value.websocket?.endpoint === pathname) return true;
    return Object.values(value).some((child) => Array.isArray(child)
      ? child.some(visit)
      : visit(child));
  };
  return visit(page);
}

async function requestBody(request: Request): Promise<any> {
  try { return await request.clone().json(); } catch { return null; }
}

async function uploadKind(request: Request): Promise<string | null> {
  try {
    const form = await request.clone().formData();
    return JSON.parse(String(form.get('meta') || '{}')).kind || null;
  } catch {
    return null;
  }
}

export function createYamlHostApi(services: YamlRuntimeContext[]) {
  const call = async (service: YamlRuntimeContext, request: Request, url: URL, server?: ModuleServer) =>
    service.api(url.pathname.startsWith('/api/events/') ? request : request.clone(), url, server);

  return async (request: Request, url: URL, server?: ModuleServer): Promise<Response | null | undefined> => {
    const { pathname } = url;
    const { method } = request;
    if (pathname === '/api/menu' && method === 'GET') {
      const menuServices = services.filter((service) => service.menus.size);
      if (!menuServices.length) return null;
      return json(menuServices.flatMap((service) => [...service.menus.values()].map((entry: any) => ({
        module: entry.module,
        ...entry.config,
        i18n: translationMap(service.catalogs || new Map(), requestLanguage(url), '*'),
      }))));
    }

    let candidates: YamlRuntimeContext[] | null = null;
    const pageMatch = pathname.match(/^\/api\/pages\/([A-Za-z0-9_-]+)$/);
    const actionMatch = pathname.match(/^\/api\/actions\/([A-Za-z0-9_.-]+)$/);
    const datasourceMatch = pathname.match(/^\/api\/datasources\/([A-Za-z0-9_-]+)\/workflow$/);
    const attachmentMatch = services.find((service) => Object.values(service.storage?.attachments || {}).some((entry: any) => typeof entry?.download?.route === 'string' && pathname.startsWith(`${entry.download.route}/`)));
    if (pageMatch) candidates = services.filter((service) => service.pages.has(pageMatch[1]));
    else if (actionMatch) candidates = services.filter((service) => service.actions.has(actionMatch[1])
      || [...service.pages.values()].some((page: any) => (page.actions || []).some((action: any) => action.action === actionMatch[1])));
    else if (datasourceMatch) candidates = services.filter((service) => service.datasources.has(datasourceMatch[1]));
    else if (attachmentMatch) candidates = [attachmentMatch];
    else if (pathname.startsWith('/api/events/')) {
      candidates = services.filter((service) => [...service.pages.values()].some((page) => hasWebsocketEndpoint(page, pathname)));
    } else if (pathname === '/api/query' && method === 'POST') {
      const body = await requestBody(request);
      if (typeof body?.sourceId === 'string') candidates = services.filter((service) => service.datasources.has(body.sourceId));
    } else if (pathname === '/api/upload' && method === 'POST') {
      const kind = await uploadKind(request);
      if (kind) candidates = services.filter((service) => [...service.actions.values()].some((action: any) => action.type === 'upload' && action.kind === kind));
    }
    if (!candidates?.length) return null;

    for (const service of candidates) {
      const response = await call(service, request, url, server);
      if (response === undefined) return undefined;
      if (response && response.status !== 404) return response;
    }
    return null;
  };
}
