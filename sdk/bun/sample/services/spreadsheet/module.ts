import { loadYamlServiceManifest, YamlServiceModule } from '@core3/server/yaml-service';
import type { ModuleContext, ModuleLifecycle } from '@core3/server/module';

type SpreadsheetService = { call(operation: string, request?: Record<string, unknown>): Promise<any> };

export default class SpreadsheetModule implements ModuleLifecycle {
  readonly id = 'spreadsheet';
  private delegate: YamlServiceModule | null = null;
  private authAdapter: { getCurrentUser(request: Request): Promise<any>; hasPermission(user: any, permission: string): boolean } | null = null;

  private getDelegate(context: ModuleContext) {
    this.delegate ??= new YamlServiceModule(loadYamlServiceManifest(context.moduleRoot));
    return this.delegate;
  }

  install(context: ModuleContext): void { this.getDelegate(context).install(context); }

  async load(context: ModuleContext): Promise<void> {
    const delegate = this.getDelegate(context);
    await delegate.load(context);
    const service = context.resolveService<SpreadsheetService>('yaml.service.spreadsheet');
    this.authAdapter = context.resolveService<any>('auth.adapter');
    const yamlApi = delegate.getRuntimeContext()?.api;
    context.registerApi(async (request, url, server) => {
      const response = await this.handleShareRoute(request, url, service);
      if (response) return response;
      return yamlApi ? (await yamlApi(request, url, server)) || null : null;
    });
  }

  async unload(context: ModuleContext): Promise<void> {
    await this.delegate?.unload(context);
    this.delegate = null;
  }

  uninstall(context: ModuleContext): void { this.delegate?.uninstall(context); }

  async handleShareRoute(request: Request, url: URL, service: SpreadsheetService): Promise<Response | null> {
    const match = url.pathname.match(/^\/dashboard\/(share|data|download)\/([^/]+)\/([A-Za-z0-9_-]+)$/);
    if (!match) return null;
    const [, kind, shareId, token] = match;
    const result = await service.call(kind === 'download' ? 'spreadsheet.public.export' : 'spreadsheet.public.share', {
      share_id: shareId,
      token,
    });
    const share = result?.share?.[0];
    if (!share || share.revoked || !share.published) return this.json({ error: 'Dashboard share is unavailable', code: 'SPREADSHEET_SHARE_NOT_FOUND' }, 404);
    if (kind === 'share') return null;
    if (kind === 'data') {
      if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
      if (share.snapshot_status === 'empty') return this.json({ error: 'Dashboard workbook is empty', code: 'SPREADSHEET_WORKBOOK_EMPTY' }, 404);
      if (share.snapshot_status !== 'ready') return this.json({ error: 'Dashboard workbook is unavailable', code: 'SPREADSHEET_WORKBOOK_UNAVAILABLE' }, 503);
      return new Response(JSON.stringify({ snapshot: this.parseSnapshot(share.workbook_snapshot), is_frozen: true, dashboard_name: share.dashboard_name }), {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
      });
    }
    if (request.method !== 'GET') return this.json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
    if (!request.headers.get('Authorization')) return this.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401);
    if (this.authAdapter) {
      let user: any;
      try { user = await this.authAdapter.getCurrentUser(request); } catch { return this.json({ error: 'Authentication required', code: 'UNAUTHORIZED' }, 401); }
      if (!this.authAdapter.hasPermission(user, 'spreadsheet.export')) return this.json({ error: 'You do not have rights to export this dashboard', code: 'FORBIDDEN' }, 403);
    }
    if (share.snapshot_status !== 'ready') return this.json({ error: 'Dashboard export is unavailable', code: 'SPREADSHEET_EXPORT_UNAVAILABLE' }, 503);
    const filename = `${String(share.dashboard_name || 'dashboard').replace(/[^A-Za-z0-9_-]+/g, '-')}.xlsx`;
    return new Response(JSON.stringify(this.parseSnapshot(share.workbook_snapshot)), {
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' },
    });
  }

  private parseSnapshot(value: unknown) {
    if (typeof value === 'object' && value) return value;
    try { return JSON.parse(String(value || '{}')); } catch { return {}; }
  }

  private json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } });
  }
}
