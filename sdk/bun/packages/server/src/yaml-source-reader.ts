import type { ModuleApiHandler } from './module';

export type YamlSourceReader = {
  readSource(request: Request, sourceId: string, params: Record<string, unknown>, skip: number, top: number): Promise<any>;
};

/** Internal read-only entry point through the owning service's normal auth path. */
export function createYamlSourceReader(api: ModuleApiHandler): YamlSourceReader {
  return {
    async readSource(request, sourceId, params, skip, top) {
      const url = new URL('/api/query', request.url);
      const headers = new Headers(request.headers);
      headers.delete('content-length'); headers.set('content-type', 'application/json');
      const query = new Request(url, { method: 'POST', headers, body: JSON.stringify({ sourceId, params, skip, top }) });
      const response = await api(query, url);
      if (!response) throw Object.assign(new Error('Datasource service unavailable'), { status: 503, code: 'WORKBOOK_SOURCE_UNAVAILABLE' });
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(data.error || data.message || 'Datasource query failed'), { status: response.status, code: data.code || 'WORKBOOK_SOURCE_FAILED' });
      return data;
    },
  };
}
