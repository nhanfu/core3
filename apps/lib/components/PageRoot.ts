import { evalExpr, interpolate } from '../expr.ts';
import { hasPermission, resolveAction } from '../meta.ts';
import { navigate, getPageParams, pushParams } from '../navigate.ts';
import { appendIcon, hasIcon } from './Icon.ts';
import { EventPopup } from './EventPopup.ts';
import { resolveDatePreset } from './ListToolbar.ts';
import { PageFormModal } from './PageFormModal.ts';
import { PageGridRenderers } from './PageGridRenderers.ts';
import { PageDetailRenderers } from './PageDetailRenderers.ts';
import { BaseComponent } from './BaseComponent.ts';
import { loginPath, safeRedirect } from '../auth-redirect.ts';

class PageChild extends BaseComponent {
  constructor(id: string, private readonly definition: any, private readonly renderDefinition: any) {
    super(id);
  }

  render(container: HTMLElement) {
    this._container = container;
    return this.draw(container);
  }

  draw(container: HTMLElement) {
    return this.renderDefinition(this.definition, container);
  }
}

class PageRoot extends BaseComponent {
  constructor(id: string, state: any, private readonly options: any) {
    super(id, state);
  }

  async render(container: HTMLElement) {
    this._container = container;
    await this.draw(container);
  }

  async draw(container: HTMLElement) {
    const { config, dataMap, ctx } = this.state;
    const { applySourceFilters, handleAction, renderComponentDef } = this.options;

    container.innerHTML = '';
    const pageDiv = document.createElement('div');
    pageDiv.className = 'tms-page';
    if ((config.components || []).some((component: any) => component.type === 'OdooFormView')) pageDiv.classList.add('o-form-page');
    container.appendChild(pageDiv);

    if (config.title) document.title = config.title;

    let pageHeader: HTMLElement | null = null;
    const ownsControlPanel = !(config.components || []).some((component: any) => component.type === 'OdooFormView')
      && (config.components || []).some((component: any) => component.type === 'ListView' && component.variant === 'odoo');
    if (config.page?.breadcrumb?.length && !ownsControlPanel) {
      pageHeader = document.createElement('div');
      pageHeader.className = 'page-header';
      const heading = document.createElement('div');
      const breadcrumb = document.createElement('div');
      breadcrumb.className = 'page-breadcrumb';
      for (const [index, item] of config.page.breadcrumb.entries()) {
        if (index) {
          const separator = document.createElement('span');
          separator.className = 'page-breadcrumb-separator';
          separator.textContent = '›';
          breadcrumb.append(separator);
        }
        const isCurrent = index === config.page.breadcrumb.length - 1;
        const crumb = document.createElement(isCurrent ? 'span' : 'a');
        crumb.className = isCurrent ? 'page-breadcrumb-current' : 'page-breadcrumb-link';
        crumb.textContent = item;
        if (!isCurrent) {
          const pathSegments = window.location.pathname.split('/').filter(Boolean);
          const routeLength = pathSegments.length - config.page.breadcrumb.length + index + 1;
          const targetPath = routeLength > 0 ? `/${pathSegments.slice(0, routeLength).join('/')}` : '';
          if (targetPath) {
            const link = crumb as HTMLAnchorElement;
            link.href = targetPath;
            link.addEventListener('click', event => {
              event.preventDefault();
              navigate(targetPath);
            });
          } else {
            const textCrumb = document.createElement('span');
            textCrumb.className = 'page-breadcrumb-link';
            textCrumb.textContent = item;
            breadcrumb.append(textCrumb);
            continue;
          }
        }
        breadcrumb.append(crumb);
      }
      heading.append(breadcrumb);
      pageHeader.append(heading);
      pageDiv.appendChild(pageHeader);
      if (config.scope) {
        const scopePill = document.createElement('span');
        scopePill.className = 'scope-pill';
        scopePill.textContent = `${config.scope.label}: ${config.scope.value}`;
        pageHeader.append(scopePill);
      }
    }

    if (config.toolbar?.length && !ownsControlPanel) {
      const toolbarDiv = document.createElement('div');
      toolbarDiv.className = pageHeader ? 'page-header-actions' : 'page-toolbar';
      toolbarDiv.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;';
      for (const btn of config.toolbar) {
        if (btn.show_if && !Boolean(evalExpr(btn.show_if, ctx))) continue;
        if (btn.permission && !hasPermission(ctx.user, btn.permission)) continue;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `btn btn-${btn.variant || 'secondary'} inline-flex items-center gap-1.5`;
        if (btn.icon) {
          const icon = document.createElement('span');
          icon.setAttribute('aria-hidden', 'true');
          if (hasIcon(btn.icon)) appendIcon(icon, btn.icon);
          else icon.textContent = btn.icon;
          button.appendChild(icon);
        }
        if (btn.label) button.appendChild(document.createTextNode(btn.label));
        button.addEventListener('click', async () => {
          const actionDef = (config.actions || []).find((action: any) => action.id === btn.action);
          if (actionDef) await handleAction(actionDef, null);
          else console.warn(`[page-renderer] Toolbar action not found: ${btn.action}`);
        });
        toolbarDiv.appendChild(button);
      }
      if (pageHeader) pageHeader.appendChild(toolbarDiv);
      else {
        toolbarDiv.style.marginBottom = '20px';
        pageDiv.appendChild(toolbarDiv);
      }
    }

    if (config.filters) {
      const { FilterBar } = await import('./FilterBar.ts');
      const filters = (config.filters.fields || []).map((field: any) => {
        if (!field.options_source) return field;
        const rows = dataMap[field.options_source]?.data;
        return {
          ...field,
          options: Array.isArray(rows)
            ? rows.map((row: any) => ({
              value: String(row.value ?? row.id ?? row.name ?? ''),
              label: String(row.label ?? row.name ?? row.value ?? row.id ?? ''),
            }))
            : [],
        };
      });
      const filterSlot = document.createElement('div');
      filterSlot.style.marginBottom = '20px';
      pageDiv.appendChild(filterSlot);
      const filterBar = new FilterBar(
        'page-filter-bar',
        { values: {} },
        filters,
        { all: config.filters.all_label, clear: config.filters.clear_label },
      );
      filterBar._onAction = async (actionId: string, params: any) => {
        if (actionId === 'filter.change') await applySourceFilters(config.filters.source, params?.values || {});
        else if (actionId === 'filter.clear') await applySourceFilters(config.filters.source, {});
      };
      filterBar.mount(filterSlot);
    }

    this.children = [];
    let previousPanelContent: HTMLElement | undefined;
    for (const [index, def] of (config.components || []).entries()) {
      const target = def.mount_in === 'previous-panel' && previousPanelContent ? previousPanelContent : pageDiv;
      const child = new PageChild(`${this.id}-child-${index}`, def, renderComponentDef);
      child.parent = this;
      this.children.push(child);
      const contentSlot = await child.render(target);
      previousPanelContent = contentSlot instanceof HTMLElement ? contentSlot : undefined;
    }
  }
}

export class PageRuntime extends BaseComponent {
  constructor(config: any, private readonly registry: Map<string, any>, private readonly runtimeContext: any = {}) {
    super('page-runtime', { config });
  }

  async render(container: HTMLElement = document.body) {
    this._container = container;
    await this.draw(container);
  }

  async draw(container: HTMLElement) {
    const { config } = this.state;
    const registry = this.registry;
  // Dynamic imports to avoid circular deps
  const { client } = await import('../client.ts');
  const { createQuery } = await import('../dtos.ts');

  // 1. Auth check
  const user: any = window.__CORE3_USER__ || {};
  const requiredPerms = config.page?.auth?.require || [];
  if (requiredPerms.length) {
    if (!requiredPerms.every(p => hasPermission(user, p))) {
        const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
        window.location.href = loginPath(safeRedirect(current));
      return;
    }
  }

  // 2. Build context
  const pageParams: Record<string, string> = { ...getPageParams() };
  const initialDateFilters: Record<string, string> = {};
  for (const component of config.components || []) {
    const range = component.type === 'ListToolbar' ? component.date_range : undefined;
    if (!range?.default_preset) continue;
    const dates = resolveDatePreset(range.default_preset);
    initialDateFilters[range.from_field || 'from_date'] = dates.from;
    initialDateFilters[range.to_field || 'to_date'] = dates.to;
  }
  Object.assign(pageParams, initialDateFilters);
  const ctx: any = { user, row: {}, state: pageParams, context: this.runtimeContext };

  // 3. Fetch datasources
  const dataMap: Record<string, any> = {};
  const filterState: Record<string, any> = {};    // sourceId -> current filter values object
  const paginationState: Record<string, any> = {}; // sourceId -> { skip, top, page }
  const sortState: Record<string, { field: string; direction: 'asc' | 'desc' } | undefined> = {};
  const sourceBindings: Record<string, Array<(data: any) => void>> = {};

  const sourceDefs = collectSources(config);
  for (const src of sourceDefs.values()) {
    const pageSize = src.page_size || 25;
    const usesListUrlState = src.url_pagination === true;
    const requestedPageSize = usesListUrlState ? Number(pageParams.page_size) : NaN;
    const top = Number.isFinite(requestedPageSize) && requestedPageSize > 0
      ? Math.max(1, Math.min(Math.floor(requestedPageSize), 100))
      : pageSize;
    const requestedPage = usesListUrlState ? Number(pageParams.page) : NaN;
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
    paginationState[src.id] = { skip: (page - 1) * top, top, page };
    if (usesListUrlState && pageParams.sort) {
      sortState[src.id] = {
        field: String(pageParams.sort),
        direction: pageParams.sort_dir === 'desc' ? 'desc' : 'asc',
      };
    }
    filterState[src.id] = { ...pageParams, ...initialDateFilters };
    if (src.data !== undefined) {
      dataMap[src.id] = {
        data: src.data,
        meta: src.meta || { total: Array.isArray(src.data) ? src.data.length : 1, page: 1, pageSize },
      };
      continue;
    }
    try {
      const result = await client.query(
        createQuery({ sourceId: src.id, params: pageParams, skip: paginationState[src.id].skip, top: paginationState[src.id].top, sort: sortState[src.id] })
      );
      dataMap[src.id] = result;
    } catch (err) {
      console.error(`[page-renderer] Failed to load datasource "${src.id}":`, err);
      dataMap[src.id] = { data: src.single ? {} : [], meta: { total: 0, page: 1, pageSize } };
    }
  }
  for (const [sourceId, result] of Object.entries(dataMap)) {
    if (result?.data && !Array.isArray(result.data)) {
      ctx.state[sourceId] = result.data;
    }
  }

  // ── Shared helpers (closures over dataMap, filterState, paginationState) ──

  async function refetchSource(
    sourceId: string,
    filters = {},
    skip = 0,
    top = 25,
    sort = sortState[sourceId],
    pivot = undefined,
  ) {
    const result = await client.query(
      createQuery({ sourceId, params: { ...pageParams, ...filters }, sort, skip, top, pivot })
    );
    dataMap[sourceId] = result;
    if (result?.data && !Array.isArray(result.data)) {
      ctx.state = { ...ctx.state, [sourceId]: result.data };
    }
    return result;
  }

  function bindSource(sourceId: string | undefined, update: (data: any) => void) {
    if (!sourceId) return;
    (sourceBindings[sourceId] ||= []).push(update);
  }

  function updateBoundComponents(sourceId: string, data: any) {
    for (const update of sourceBindings[sourceId] || []) update(data);
  }

  async function refreshStatusTabCounts(sourceId: string, comp: any, def: any) {
    if (def.show_counts === false) return;
    const field = def.filter_field || 'status';
    const filters = { ...(filterState[sourceId] || {}) };
    delete filters[field];
    try {
      const facetResult = await client.query(createQuery({
        sourceId,
        params: { ...pageParams, ...filters },
        skip: 0,
        top: 1,
        facetField: field,
      }));
      const facets = facetResult.meta?.facets || {};
      comp.tabs = (def.tabs || []).map((tab: any) => ({
        ...tab,
        count: tab.count !== undefined ? tab.count : tab.id === ''
          ? Number(facetResult.meta?.total ?? 0)
          : Number(facets[String(tab.id)] || 0),
      }));
      comp.redraw();
    } catch (error) {
      console.error(`[page-renderer] status facet error for "${sourceId}":`, error);
    }
  }

  async function refreshSources(sourceIds: string[] = []) {
    for (const sourceId of (sourceIds || [])) {
      const ps = paginationState[sourceId] || { skip: 0, top: 25, page: 1 };
      const fs = filterState[sourceId] || {};
      const data = await refetchSource(sourceId, fs, ps.skip, ps.top);
      updateBoundComponents(sourceId, data);
    }
  }

  async function applySourceFilters(sourceId: string, values: Record<string, unknown> = {}, pivot?: any, updateUrl = true) {
    const normalized = Object.fromEntries(
      Object.entries({ ...(filterState[sourceId] || {}), ...values })
        .map(([key, value]) => [key, value === '' ? null : value])
    );
    filterState[sourceId] = normalized;
    if (updateUrl) {
      const nextParams = { ...getPageParams() } as Record<string, unknown>;
      for (const [key, value] of Object.entries(values)) {
        if (value == null || value === '') delete nextParams[key];
        else nextParams[key] = value;
      }
      nextParams.page = '1';
      pushParams(nextParams);
    }
    paginationState[sourceId] = {
      skip: 0,
      top: paginationState[sourceId]?.top || 25,
      page: 1,
    };
    try {
      const data = await refetchSource(sourceId, normalized, 0, paginationState[sourceId].top, sortState[sourceId], pivot);
      updateBoundComponents(sourceId, data);
    } catch (err) {
      console.error('[page-renderer] filter fetch error:', err);
    }
  }

  // ── Action handler ────────────────────────────────────────────────────────

  function showEventPopup(actionDef: any) {
    const popup = new EventPopup(`event-popup-${Date.now()}`, { open: true }, actionDef);
    popup.mount(document.body);
  }

  async function handleAction(actionDef: any, row: any, actionContext: any = ctx) {
    if (!actionDef) return;
    const rowCtx = { ...actionContext, row: row || {} };
    const resolved = resolveAction(actionDef, rowCtx);
    if (!resolved.visible) return;

    switch (actionDef.type) {
      case 'login': {
        const response = await fetch(actionDef.endpoint || '/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: row?.email, password: row?.password }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Invalid credentials');
        const { setAuth, getDefaultRoute } = await import('../../public/app.ts');
        await setAuth(result.token, result.user);
        const redirectParam = String(actionDef.redirect_param || 'redirect');
        const redirect = safeRedirect(new URLSearchParams(window.location.search).get(redirectParam));
        window.history.replaceState(null, '', redirect || getDefaultRoute(result.user));
        window.location.reload();
        break;
      }
      case 'event': {
        const eventName = String(actionDef.event || '').trim();
        if (!eventName) throw new Error('Event action requires an event name');
        window.dispatchEvent(new CustomEvent(eventName, {
          detail: resolveActionParams(actionDef.params, rowCtx),
        }));
        if (actionDef.message) showEventPopup(actionDef);
        break;
      }
      case 'request': {
        const token = (await import('../../public/app.ts')).getToken();
        const response = await fetch(actionDef.endpoint, {
          method: actionDef.method || 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(resolveActionParams(actionDef.body, rowCtx)),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Profile update failed');
        break;
      }
      case 'client': {
        const source = String(actionDef.script || '').trim();
        // YAML client actions must contain a function source, for example:
        // `async ({ row, request }) => { ... }`.
        // eslint-disable-next-line no-new-func
        const fn = new Function(`return (${source})`)();
        if (typeof fn !== 'function') throw new TypeError('Client action script must evaluate to a JavaScript function');
        const token = (await import('../../public/app.ts')).getToken();
        const request = async (endpoint: string, options: RequestInit = {}) => {
          const response = await fetch(endpoint, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              ...(options.headers || {}),
            },
            ...(options.body && typeof options.body !== 'string' ? { body: JSON.stringify(options.body) } : {}),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || 'Request failed');
          return result;
        };
        const { i18n } = await import('../i18n.ts');
        const { navigate: appNavigate } = await import('../../public/app.ts');
        await fn({
          user: ctx.user,
          row: row || {},
          state: ctx.state,
          request,
          setLanguage: async (language: string) => {
            await i18n.setLang(String(language));
            await appNavigate(window.location.pathname, { lc: String(language) });
          },
        });
        break;
      }
      case 'logout': {
        await (await import('../../public/app.ts')).logout();
        break;
      }
      case 'form':
        await openFormModal(actionDef, row);
        break;

      case 'server_form':
        await openFormModal(actionDef, row);
        break;

      case 'delete': {
        const msg = interpolate(
          actionDef.confirm || 'Delete this record?',
          { ...ctx, row: row || {} }
        );
        if (!confirm(msg)) return;
        await client.patch({
          table: actionDef.table,
          action: 'delete',
          id: row?.id ?? null,
          scope: actionDef.scope,
          changes: [],
        });
        if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
        break;
      }

      case 'patch': {
        if (actionDef.confirm) {
          const msg = interpolate(actionDef.confirm, { ...ctx, row: row || {} });
          if (!confirm(msg)) return;
        }
        const changes = Object.entries(actionDef.body || {}).map(([field, value]) => ({ field, value }));
        await client.patch({
          table: actionDef.table,
          action: 'update',
          id: row?.id ?? null,
          scope: actionDef.scope,
          changes,
        });
        if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
        break;
      }

      case 'server': {
        if (actionDef.confirm) {
          const msg = interpolate(actionDef.confirm, { ...ctx, row: row || {} });
          if (!confirm(msg)) return;
        }
        try {
          const result = await client.action(actionDef.action, {
            id: row?.id ?? null,
            ...resolveActionParams(actionDef.params, rowCtx),
          });
          if (actionDef.result === 'alert') {
            const field = actionDef.result_field || 'message';
            const value = result && typeof result === 'object' ? result[field] : result;
            alert(String(value ?? 'Thành công'));
          }
          if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Action failed';
          alert(message);
        }
        break;
      }

      case 'navigate':
        navigate(
          interpolate(actionDef.navigate_to, rowCtx),
          resolveActionParams(actionDef.params, rowCtx),
        );
        break;

      case 'upload': {
        let uploadFile = row?.file instanceof File ? row.file : null;
        if (!uploadFile) {
          uploadFile = await new Promise<File | null>(resolve => {
            const input = document.createElement('input');
            input.type = 'file';
            input.onchange = () => resolve(input.files?.[0] || null);
            input.click();
          });
        }
        if (!uploadFile) break;
        try {
          const uploadMeta: any = { kind: actionDef.kind };
          if (actionDef.kind === 'chat_attachment') {
            uploadMeta.thread_id = row.id;
            uploadMeta.content = row.content;
          } else if (actionDef.kind === 'order_attachment') {
            uploadMeta.order_id = resolveActionParams(
              actionDef.params || { order_id: '{row.id}' },
              rowCtx,
            ).order_id;
          } else if (actionDef.kind === 'employee_document') {
            uploadMeta.employee_id = resolveActionParams(actionDef.params || { employee_id: '{state.id}' }, { ...ctx, row: row || {} }).employee_id;
          } else if (actionDef.kind === 'contract_document') {
            uploadMeta.contract_id = resolveActionParams(actionDef.params || { contract_id: '{state.id}' }, { ...ctx, row: row || {} }).contract_id;
          } else if (actionDef.kind === 'company_document') {
            uploadMeta.company_id = resolveActionParams(actionDef.params || { company_id: '{state.id}' }, { ...ctx, row: row || {} }).company_id;
          } else if (actionDef.kind === 'master_data_import') {
            uploadMeta.scope = actionDef.scope;
          }
          const result = await client.uploadFile(uploadFile, {
            ...uploadMeta,
          });
          if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
          return result;
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Upload failed');
        }
        break;
      }

      case 'download': {
        if (!row?.id) break;
        try {
          const path = actionDef.kind === 'employee_document'
            ? `/hr/employee-documents/${encodeURIComponent(String(row.id))}`
            : actionDef.kind === 'contract_document'
              ? `/hr/contract-documents/${encodeURIComponent(String(row.id))}`
              : actionDef.kind === 'company_document'
                ? `/org/company-documents/${encodeURIComponent(String(row.id))}`
                : actionDef.kind === 'order_attachment'
                  ? `/orders/attachments/${encodeURIComponent(String(row.id))}`
                  : `/chat/attachments/${encodeURIComponent(String(row.id))}`;
          await client.downloadFile(
            path,
            String(row.file_name || 'attachment'),
          );
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Download failed');
        }
        break;
      }

      default:
        console.warn(`[page-renderer] Unknown action type: ${actionDef.type}`);
    }
  }

  function resolveActionParams(
    params: Record<string, unknown> | undefined,
    actionContext: any,
  ) {
    return Object.fromEntries(
      Object.entries(params || {}).map(([key, value]) => [
        key,
        typeof value === 'string' ? interpolate(value, actionContext) : value,
      ]),
    );
  }

  const formModal = new PageFormModal({
    dataMap,
    ctx,
    client,
    refreshSources,
    resolveActionParams,
  });

  async function handleInlineForm(actionDef: any, values: Record<string, unknown>) {
    if (!actionDef) return;
    if (actionDef.type === 'form' && (actionDef.operation === 'update' || actionDef.operation === 'insert')) {
      const id = values.id ?? pageParams.id ?? ctx.state.id;
      const changes = (actionDef.fields || [])
        .filter((field: any) => field.field !== 'id' && values[field.field] !== undefined)
        .map((field: any) => ({ field: field.field, value: values[field.field] }));
      await client.patch({ table: actionDef.table, action: actionDef.operation, id: actionDef.operation === 'insert' ? null : id, scope: actionDef.scope, changes });
      if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
      return;
    }
    if (actionDef.type === 'server_form') {
      await client.action(actionDef.action, {
        ...resolveActionParams(actionDef.params, { ...ctx, row: values }),
        values,
      });
      if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
    }
  }

  // ── Component renderers ───────────────────────────────────────────────────

  const gridRenderer = new PageGridRenderers({
    config,
    dataMap,
    ctx,
    bindSource,
    sortState,
    paginationState,
    filterState,
    pageParams,
    refetchSource,
    updateBoundComponents,
    client,
    createQuery,
    handleAction,
    applySourceFilters,
    refreshSources,
    handleInlineForm,
    resolveActionParams,
    registry,
  });
  const { renderStatRow, renderGridView, renderDataGrid, renderListView, renderScheduleGrid } = gridRenderer.renderers;

  const detailRenderer = new PageDetailRenderers({
    config,
    dataMap,
    ctx,
    bindSource,
    filterState,
    paginationState,
    sortState,
    pageParams,
    client,
    createQuery,
    refreshSources,
    refetchSource,
    applySourceFilters,
    handleAction,
    handleInlineForm,
    resolveActionParams,
    registry,
    renderStatRow,
    renderGridView,
    renderDataGrid,
    renderListView,
    renderScheduleGrid,
    refreshStatusTabCounts,
  });

  const { chartState, renderComponentDef } = detailRenderer.renderers;
  const openFormModal = formModal.openFormModal;
  const root = new PageRoot('page-root', { config, dataMap, ctx }, {
    applySourceFilters,
    handleAction,
    renderComponentDef,
  });
  this.children = [formModal, gridRenderer, detailRenderer, root];
  for (const child of this.children) child.parent = this;
  await root.render(container);

  return { dataMap, ctx };
  }
}

function collectSources(config: any) {
  const sources = new Map<string, any>();
  const add = (id: string, def: any = {}) => {
    if (!id) return;
    const existing = sources.get(id);
    if (existing) {
      // A toolbar/tabs component may reference the source before its grid.
      // Keep the grid's page size rather than freezing the default at 25.
      if (def.page_size) existing.page_size = def.page_size;
      if (def.type === 'ListView') existing.url_pagination = true;
      return;
    }
    sources.set(id, {
      id,
      single: def.single ?? def.type === 'StatRow',
      page_size: def.page_size,
      url_pagination: def.type === 'ListView',
      data: def.data,
      meta: def.meta,
    });
  };
  for (const source of config.datasources || []) add(source.id, source);
  const visit = (components: any[] = []) => {
    for (const component of components) {
      add(component.source, component);
      if (component.message_source) {
        add(component.message_source, {
          page_size: component.message_page_size,
        });
      }
      if (component.attachment_source) {
        add(component.attachment_source, {
          page_size: component.attachment_page_size || 100,
        });
      }
      if (component.follower_candidates_source) {
        add(component.follower_candidates_source, {
          page_size: component.follower_candidates_page_size || 100,
        });
      }
      for (const tab of component.tabs || []) visit(tab.components);
    }
  };
  visit(config.components);
  add(config.filters?.source);
  for (const field of config.filters?.fields || []) add(field.options_source);
  for (const action of config.actions || []) {
    for (const field of action.fields || []) add(field.options_source);
  }
  return sources;
}
