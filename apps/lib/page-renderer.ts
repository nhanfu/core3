/**
 * YAML-driven page renderer — no hand-coded page JS files needed.
 *
 * Takes a declarative page config (parsed from YAML) and:
 *   1. Checks auth permissions
 *   2. Fetches all declared datasources via POST /api/query
 *   3. Renders toolbar, filters, and components (StatRow, GridView, TabGroup)
 *   4. Wires CRUD actions (form modal, delete, patch, navigate)
 *   5. Handles server-side pagination and filter re-fetching
 *
 * Usage:
 *   import { renderPage } from '/lib/page-renderer.ts';
 *   const config = jsyaml.load(yamlString);
 *   await renderPage(config, { container: outlet });
 */

import { evalExpr, interpolate } from './expr.ts';
import { resolveAction } from './meta.ts';
import { navigate, getPageParams } from './navigate.ts';
import { validatePageDefinition } from './yaml/schema.ts';
import { appendIcon, hasIcon } from './components/Icon.ts';
import { resolveDatePreset } from './components/ListToolbar.ts';
import { AsyncSelect } from './components/AsyncSelect.ts';
import { MoneyInput } from './components/MoneyInput.ts';

// ── Component registry ────────────────────────────────────────────────────────

const registry = new Map<string, any>();

export function register(name: string, Ctor: any) {
  registry.set(name, Ctor);
}

export function registerAll(map: Record<string, any>) {
  for (const [k, v] of Object.entries(map)) registry.set(k, v);
}

// ── Main render function ──────────────────────────────────────────────────────

export async function renderPage(config: any, { container = document.body }: { container?: HTMLElement } = {}) {
  validatePageDefinition(config, { allowExternalSources: true });

  // Dynamic imports to avoid circular deps
  const { client } = await import('./client.ts');
  const { createQuery } = await import('./dtos.ts');

  // 1. Auth check
  const user: any = window.__CORE3_USER__ || {};
  const requiredPerms = config.page?.auth?.require || [];
  if (requiredPerms.length) {
    const userPerms = user.permissions || [];
    if (!requiredPerms.every(p => userPerms.includes(p))) {
      window.location.href = '/login';
      return;
    }
  }

  // 2. Build context
  const pageParams = { ...getPageParams() };
  const initialDateFilters: Record<string, string> = {};
  for (const component of config.components || []) {
    const range = component.type === 'ListToolbar' ? component.date_range : undefined;
    if (!range?.default_preset) continue;
    const dates = resolveDatePreset(range.default_preset);
    initialDateFilters[range.from_field || 'from_date'] = dates.from;
    initialDateFilters[range.to_field || 'to_date'] = dates.to;
  }
  Object.assign(pageParams, initialDateFilters);
  const ctx: any = { user, row: {}, state: pageParams };

  // 3. Fetch datasources
  const dataMap: Record<string, any> = {};
  const filterState: Record<string, any> = {};    // sourceId -> current filter values object
  const paginationState: Record<string, any> = {}; // sourceId -> { skip, top, page }
  const sortState: Record<string, { field: string; direction: 'asc' | 'desc' } | undefined> = {};
  // boundComponents: sourceId -> [{ comp, def, compType: 'GridView'|'DataGrid'|'StatRow'|'Chart' }]
  const boundComponents: Record<string, any[]> = {};

  const sourceDefs = collectSources(config);
  for (const src of sourceDefs.values()) {
    const pageSize = src.page_size || 25;
    paginationState[src.id] = { skip: 0, top: pageSize, page: 1 };
    filterState[src.id] = { ...initialDateFilters };
    if (src.data !== undefined) {
      dataMap[src.id] = {
        data: src.data,
        meta: src.meta || { total: Array.isArray(src.data) ? src.data.length : 1, page: 1, pageSize },
      };
      continue;
    }
    try {
      const result = await client.query(
        createQuery({ sourceId: src.id, params: pageParams, skip: 0, top: pageSize })
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
  ) {
    const result = await client.query(
      createQuery({ sourceId, params: { ...pageParams, ...filters }, sort, skip, top })
    );
    dataMap[sourceId] = result;
    if (result?.data && !Array.isArray(result.data)) {
      ctx.state = { ...ctx.state, [sourceId]: result.data };
    }
    return result;
  }

  function updateBoundComponents(sourceId: string, data: any) {
    for (const entry of (boundComponents[sourceId] || [])) {
      if (entry.compType === 'GridView' || entry.compType === 'DataGrid' || entry.compType === 'ScheduleGrid') {
        // Use the internal setState via our stored reference (bypasses the override)
        entry._origSetState({ rows: data.data || [], meta: data.meta }, true);
      } else if (entry.compType === 'StatRow') {
        const sourceData = data.data || {};
        const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
        entry.comp.stats = (entry.def.stats || []).map(s => ({ ...s, value: getPath(sourceData, s.field) }));
        entry.comp.redraw();
      } else if (entry.compType === 'Chart') {
        entry.comp.setState(chartState(entry.def, data), true);
      } else if (entry.compType === 'SingleRecord') {
        entry._origSetState({ record: data.data || {} }, true);
      } else if (entry.compType === 'TemplatePreview') {
        entry._origSetState({
          blocks: Array.isArray(data.data) ? data.data : [],
          template: (dataMap[entry.def.template_source]?.data || {}) as Record<string, unknown>,
        }, true);
      } else if (entry.compType === 'Timeline') {
        entry._origSetState({ events: data.data || [] }, true);
      } else if (entry.compType === 'ChatThreads') {
        entry._origSetState({ threads: data.data || [] }, true);
      } else if (entry.compType === 'ChatMessages') {
        entry._origSetState({ messages: data.data || [] }, true);
      } else if (entry.compType === 'ChatAttachments') {
        entry._origSetState({ attachments: data.data || [] }, true);
      } else if (entry.compType === 'StatusTabs') {
        if (entry.def.show_counts !== false) void refreshStatusTabCounts(sourceId, entry);
      }
    }
  }

  async function refreshStatusTabCounts(sourceId: string, entry: any) {
    if (entry.def.show_counts === false) return;
    const field = entry.def.filter_field || 'status';
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
      entry.comp.tabs = (entry.def.tabs || []).map((tab: any) => ({
        ...tab,
        count: tab.count !== undefined ? tab.count : tab.id === ''
          ? Number(facetResult.meta?.total ?? 0)
          : Number(facets[String(tab.id)] || 0),
      }));
      entry.comp.redraw();
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

  async function applySourceFilters(sourceId: string, values: Record<string, unknown> = {}) {
    const normalized = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value === '' ? null : value])
    );
    filterState[sourceId] = normalized;
    paginationState[sourceId] = {
      skip: 0,
      top: paginationState[sourceId]?.top || 25,
      page: 1,
    };
    try {
      const data = await refetchSource(sourceId, normalized, 0, paginationState[sourceId].top);
      updateBoundComponents(sourceId, data);
    } catch (err) {
      console.error('[page-renderer] filter fetch error:', err);
    }
  }

  // ── Action handler ────────────────────────────────────────────────────────

  function showEventPopup(actionDef: any) {
    const overlay = document.createElement('div');
    overlay.className = 'core3-event-overlay';
    overlay.setAttribute('aria-hidden', 'false');

    const dialog = document.createElement('div');
    dialog.className = 'core3-event-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    const titleId = `event-dialog-title-${Date.now()}`;
    dialog.setAttribute('aria-labelledby', titleId);

    const icon = document.createElement('div');
    icon.className = 'core3-event-icon';
    appendIcon(icon, actionDef.icon || 'lightbulb');
    dialog.appendChild(icon);

    const title = document.createElement('h2');
    title.className = 'core3-event-title';
    title.id = titleId;
    title.textContent = actionDef.title || 'Coming soon';
    dialog.appendChild(title);

    const message = document.createElement('p');
    message.className = 'core3-event-message';
    message.textContent = actionDef.message || 'This feature is under construction.';
    dialog.appendChild(message);

    const close = () => {
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn btn-primary core3-event-close';
    closeButton.textContent = actionDef.close_label || 'Close';
    closeButton.addEventListener('click', close);
    dialog.appendChild(closeButton);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', onKeyDown);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    closeButton.focus();
  }

  async function handleAction(actionDef: any, row: any) {
    if (!actionDef) return;
    const rowCtx = { ...ctx, row: row || {} };
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
        const { setAuth, getDefaultRoute } = await import('../public/app.ts');
        await setAuth(result.token, result.user);
        window.history.replaceState(null, '', `#${getDefaultRoute(result.user)}`);
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
          } else if (actionDef.kind === 'employee_document') {
            uploadMeta.employee_id = resolveActionParams(actionDef.params || { employee_id: '{state.id}' }, { ...ctx, row: row || {} }).employee_id;
          } else if (actionDef.kind === 'contract_document') {
            uploadMeta.contract_id = resolveActionParams(actionDef.params || { contract_id: '{state.id}' }, { ...ctx, row: row || {} }).contract_id;
          } else if (actionDef.kind === 'company_document') {
            uploadMeta.company_id = resolveActionParams(actionDef.params || { company_id: '{state.id}' }, { ...ctx, row: row || {} }).company_id;
          } else if (actionDef.kind === 'master_data_import') {
            uploadMeta.scope = actionDef.scope;
          }
          await client.uploadFile(uploadFile, {
            ...uploadMeta,
          });
          if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
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

  // ── Form modal ────────────────────────────────────────────────────────────

  async function openFormModal(actionDef: any, row: any) {
    return new Promise<void>(resolve => {
      const sourceRecord = actionDef.prefill === 'source'
        ? dataMap[actionDef.prefill_source || '']?.data
        : undefined;
      const formRecord = row || sourceRecord || {};
      // Overlay
      const overlay = document.createElement('div');
      overlay.className = 'core3-form-overlay';
      overlay.setAttribute('aria-hidden', 'false');

      // Dialog
      const dialog = document.createElement('div');
      dialog.className = 'core3-form-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.tabIndex = -1;

      // Header
      const header = document.createElement('div');
      header.className = 'core3-form-header';

      const titleEl = document.createElement('h2');
      titleEl.className = 'core3-form-title';
      const titleId = `form-dialog-title-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      titleEl.id = titleId;
      dialog.setAttribute('aria-labelledby', titleId);
      titleEl.textContent = actionDef.title || '';

      const closeBtn = document.createElement('button');
      closeBtn.className = 'core3-form-close';
      appendIcon(closeBtn, 'x');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', 'Đóng');
      closeBtn.title = 'Đóng';

      header.appendChild(titleEl);
      header.appendChild(closeBtn);
      dialog.appendChild(header);

      // Fields
      const inputs: Record<string, { el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement; fieldDef: any }> = {}; // field -> { el, fieldDef }
      for (const fieldDef of (actionDef.fields || [])) {
        if (fieldDef.show_if && !Boolean(evalExpr(fieldDef.show_if, { ...ctx, row: row || {} }))) continue;
        const group = document.createElement('div');
        group.className = 'core3-form-field';

        const label = document.createElement('label');
        label.className = 'core3-form-label';
        label.textContent = fieldDef.label + (fieldDef.required ? ' *' : '');
        const fieldId = `form-field-${fieldDef.field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        label.htmlFor = fieldId;
        group.appendChild(label);

        // Determine initial value before constructing either a native control
        // or a searchable lookup adapter.
        let initialValue = fieldDef.default ?? '';
        const prefillRecord = actionDef.prefill === 'source' ? sourceRecord : row;
        if ((actionDef.prefill === 'row' || actionDef.prefill === 'source') && prefillRecord) {
          initialValue = prefillRecord[fieldDef.field] ?? fieldDef.default ?? '';
        }
        if (fieldDef.type === 'date' && initialValue && typeof initialValue === 'string') {
          initialValue = initialValue.slice(0, 10);
        } else if (fieldDef.type === 'datetime' && initialValue && typeof initialValue === 'string') {
          initialValue = initialValue.replace('Z', '').slice(0, 16);
        }

        let el;
        let usesAsyncSelect = false;
        let usesMoneyInput = false;
        if (fieldDef.type === 'async-select' || fieldDef.type === 'multi-select') {
          const optionRows = fieldDef.options_source
            ? (Array.isArray(dataMap[fieldDef.options_source]?.data) ? dataMap[fieldDef.options_source].data : [])
            : [];
          const options = fieldDef.options_source
            ? optionRows.map((option: any) => ({ value: String(option.value ?? option.id ?? option.code ?? ''), label: String(option.label ?? option.name ?? option.value ?? option.id ?? option.code ?? '') }))
            : (fieldDef.options || []).map((option: any) => {
              if (option && typeof option === 'object') {
                const value = option.value ?? option.id ?? option.code;
                return { value: String(value ?? ''), label: String(option.label ?? option.name ?? value ?? '') };
              }
              return { value: String(option ?? ''), label: String(option ?? '') };
            });
          const lookup = new AsyncSelect(fieldId, { value: initialValue }, {
            options,
            multiple: fieldDef.type === 'multi-select' || fieldDef.multiple === true,
            placeholder: fieldDef.placeholder,
            search_placeholder: fieldDef.search_placeholder,
          });
          lookup.mount(group);
          el = lookup.input;
          usesAsyncSelect = true;
        } else if (fieldDef.type === 'money') {
          const money = new MoneyInput(fieldId, { value: initialValue }, {
            currency: fieldDef.currency,
            decimals: fieldDef.decimals,
            placeholder: fieldDef.placeholder,
          });
          money.mount(group);
          el = money.input;
          usesMoneyInput = true;
        } else if (fieldDef.type === 'select') {
          el = document.createElement('select');
          el.className = `form-select core3-form-control${fieldDef.multiple ? ' core3-form-control-multiple' : ''}`;
          if (fieldDef.multiple) {
            el.multiple = true;
          }

          if (!fieldDef.multiple) {
            const emptyOpt = document.createElement('option');
            emptyOpt.value = '';
            emptyOpt.textContent = 'Chọn…';
            el.appendChild(emptyOpt);
          }

          const optionRows = fieldDef.options_source
            ? (Array.isArray(dataMap[fieldDef.options_source]?.data) ? dataMap[fieldDef.options_source].data : [])
            : [];
          const options = fieldDef.options_source
            ? optionRows.map((option: any) => ({ value: option.value ?? option.id ?? option.code, label: option.label ?? option.name ?? option.value ?? option.id ?? option.code }))
            : (fieldDef.options || []).map((option: any) => {
              if (option && typeof option === 'object') {
                const value = option.value ?? option.id ?? option.code;
                return { value, label: option.label ?? option.name ?? value };
              }
              return { value: option, label: option };
            });
          for (const opt of options) {
            const optEl = document.createElement('option');
            optEl.value = String(opt.value ?? '');
            optEl.textContent = String(opt.label ?? opt.value ?? '');
            el.appendChild(optEl);
          }
        } else if (fieldDef.type === 'textarea' || fieldDef.type === 'richtext') {
          el = document.createElement('textarea');
          el.className = fieldDef.type === 'richtext'
            ? 'form-input template-richtext core3-form-control core3-form-richtext'
            : 'form-input core3-form-control core3-form-textarea';
        } else {
          el = document.createElement('input');
          el.type = fieldDef.type === 'datetime' ? 'datetime-local' : (fieldDef.type || 'text');
          el.className = 'form-input core3-form-control';
        }
        el.id = fieldId;

        if (fieldDef.type === 'select' && fieldDef.multiple) {
          const selected = new Set(Array.isArray(initialValue) ? initialValue.map(String) : String(initialValue || '').split(',').map(value => value.trim()).filter(Boolean));
          for (const option of Array.from((el as HTMLSelectElement).options)) option.selected = selected.has(option.value);
        } else if (!usesAsyncSelect) {
          el.value = String(initialValue ?? '');
        }

        if (!usesAsyncSelect && !usesMoneyInput) group.appendChild(el);
        if (fieldDef.type === 'richtext' && Array.isArray(fieldDef.tokens) && fieldDef.tokens.length) {
          const tokenBar = document.createElement('div');
          tokenBar.className = 'template-token-picker core3-form-token-bar';
          for (const token of fieldDef.tokens) {
            const tokenButton = document.createElement('button');
            tokenButton.type = 'button';
            tokenButton.className = 'template-token core3-form-token';
            tokenButton.textContent = `{{${token}}}`;
            tokenButton.addEventListener('click', () => {
              const start = el.selectionStart ?? el.value.length;
              const end = el.selectionEnd ?? start;
              const insertion = `{{${token}}}`;
              el.value = `${el.value.slice(0, start)}${insertion}${el.value.slice(end)}`;
              el.selectionStart = el.selectionEnd = start + insertion.length;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.focus();
            });
            tokenBar.appendChild(tokenButton);
          }
          group.appendChild(tokenBar);
        }
        dialog.appendChild(group);
        inputs[fieldDef.field] = { el, fieldDef };
      }

      // Footer
      const footer = document.createElement('div');
      footer.className = 'core3-form-footer';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Hủy';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = 'Lưu';

      footer.appendChild(cancelBtn);
      footer.appendChild(saveBtn);
      dialog.appendChild(footer);

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Error banner (created lazily)
      let errorBanner: HTMLElement | null = null;
      let closed = false;

      function showError(msg: string) {
        if (!errorBanner) {
          errorBanner = document.createElement('div');
          errorBanner.className = 'core3-form-error';
          footer.insertAdjacentElement('beforebegin', errorBanner);
        }
        errorBanner.textContent = msg;
        errorBanner.style.display = '';
      }

      function closeModal() {
        if (closed) return;
        closed = true;
        document.removeEventListener('keydown', onKeyDown);
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        resolve();
      }

      function onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') closeModal();
      }

      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);
      overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
      document.addEventListener('keydown', onKeyDown);
      (Object.values(inputs)[0]?.el || dialog).focus();

      saveBtn.addEventListener('click', async () => {
        // Reset error
        if (errorBanner) errorBanner.style.display = 'none';

        // Validate required fields
        let firstInvalid: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null;
        for (const { el, fieldDef } of Object.values(inputs)) {
          const v = fieldDef.type === 'multi-select'
            ? el.value.split(',').map(value => value.trim()).filter(Boolean)
            : el instanceof HTMLSelectElement && el.multiple
            ? Array.from(el.selectedOptions).map(option => option.value)
            : el.value?.trim() ?? '';
          if (fieldDef.required && (Array.isArray(v) ? v.length === 0 : !v)) {
            el.style.borderColor = '#ef4444';
            if (!firstInvalid) firstInvalid = el;
          } else {
            el.style.borderColor = '';
          }
        }
        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }

        const changes = Object.entries(inputs).map(([field, { el }]) => ({
          field,
          value: inputs[field].fieldDef.type === 'multi-select'
            ? el.value.split(',').map(value => value.trim()).filter(Boolean)
            : el instanceof HTMLSelectElement && el.multiple
            ? Array.from(el.selectedOptions).map(option => option.value)
            : el.value,
        }));

        saveBtn.disabled = true;
        saveBtn.textContent = 'Đang lưu…';
        try {
          if (actionDef.type === 'server_form') {
            const actionContext = { ...ctx, row: row || {} };
            await client.action(actionDef.action, {
              ...resolveActionParams(actionDef.params, actionContext),
              values: Object.fromEntries(changes.map(change => [change.field, change.value])),
            });
          } else {
            await client.patch({
              table: actionDef.table,
              action: actionDef.operation,
            id: formRecord.id ?? null,
              scope: actionDef.scope,
              changes,
            });
          }
          closeModal();
          if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
        } catch (err: any) {
          console.error('[page-renderer] patch error:', err);
          showError(err.message || 'Lưu thất bại. Vui lòng thử lại.');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Lưu';
        }
      });
    });
  }

  // ── Component renderers ───────────────────────────────────────────────────

  async function renderStatRow(def: any, targetContainer: HTMLElement) {
    const { StatRow } = await import('./components/StatRow.ts');
    const sourceData = def.source ? ((dataMap[def.source] || {}).data || {}) : {};
    const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
    const mappedStats = (def.stats || []).map(s => ({ ...s, value: getPath(sourceData, s.field) }));

    const comp = new StatRow(
      `stat-row-${def.source || Date.now()}`,
      mappedStats,
      def.title || '',
      path => void navigate(path),
    );
    const slot = document.createElement('div');
    slot.className = def.variant === 'contained' ? 'core3-status-tabs-slot-contained' : '';
    slot.style.marginBottom = def.variant === 'contained' ? '0' : '16px';
    targetContainer.appendChild(slot);
    comp.mount(slot);

    if (def.source) {
      if (!boundComponents[def.source]) boundComponents[def.source] = [];
      // StatRow doesn't use the override pattern — update via stats + redraw
      boundComponents[def.source].push({ comp, def, compType: 'StatRow', _origSetState: null });
    }
  }

  async function renderGridView(def: any, targetContainer: HTMLElement) {
    const { GridView } = await import('./components/GridView.ts');
    const sourceId = def.source;
    const sourceResult = dataMap[sourceId] || { data: [], meta: {} };
    const treeRows = sourceResult.data || [];
    const treeById = new Map(treeRows.map((row: any) => [String(row.id), row]));
    const treeDepth = (row: any) => {
      if (!def.tree) return 0;
      let depth = 0;
      let parentId = row.parent_id ? String(row.parent_id) : '';
      const seen = new Set<string>();
      while (parentId && !seen.has(parentId) && depth < 20) {
        seen.add(parentId);
        const parent = treeById.get(parentId);
        if (!parent) break;
        depth += 1;
        parentId = parent.parent_id ? String(parent.parent_id) : '';
      }
      return depth;
    };
    const pageSize = def.page_size || 25;

    // Add an `id` to each column def for GridView's cell lookup key
    const columnDefs = (def.columns || []).map((col, i) => ({
      ...col,
      id: col.field || `col-${i}`,
    }));

    const comp = new GridView(
      `grid-${sourceId || Date.now()}`,
      { rows: sourceResult.data || [], meta: sourceResult.meta },
      columnDefs,
      {
        emptyState: def.empty_state,
        labels: def.labels || (config.locale === 'vi' ? {
          summaryOf: 'trên',
          previousPage: '← Trước',
          nextPage: 'Sau →',
        } : undefined),
        onSort: async (sort: { field: string; direction: 'asc' | 'desc' }) => {
          sortState[sourceId] = sort;
          paginationState[sourceId] = { skip: 0, top: paginationState[sourceId]?.top || pageSize, page: 1 };
          try {
            const data = await refetchSource(sourceId, filterState[sourceId] || {}, 0, paginationState[sourceId].top, sort);
            updateBoundComponents(sourceId, data);
          } catch (err) {
            console.error('[page-renderer] legacy grid sort fetch error:', err);
          }
        },
      }
    );

    // Override _cellState to support YAML `colors` map and `show_if` on action buttons
    comp._cellState = (colDef: any, row: any) => {
      const value = row[colDef.field];
      switch (colDef.type) {
        case 'BadgeCell':
          return {
            value,
            color: colDef.colors
              ? (colDef.colors[value] || null)
              : (colDef.colorField ? row[colDef.colorField] : null),
          };
        case 'CurrencyCell':
          return { value, currency: colDef.currency || 'USD' };
        case 'NumberCell':
          return { value, format: colDef.format || 'number' };
        case 'DateCell':
          return {
            value,
            format: colDef.format || 'short',
            overdue: colDef.overdueField ? !!row[colDef.overdueField] : false,
          };
        case 'BooleanCell':
          return { value: !!value };
        case 'ActionCell': {
          const rowCtx = { ...ctx, row };
          const visibleActions = (colDef.actions || []).filter((a: any) =>
            (!a.permission || ctx.user.permissions?.includes(a.permission))
            && (!a.show_if || evalExpr(a.show_if, rowCtx))
          );
          return { actions: visibleActions, row };
        }
        case 'AvatarCell':
          return { name: value, src: colDef.srcField ? row[colDef.srcField] : null, size: colDef.size || 'sm' };
        case 'PercentCell':
          return { value };
        default:
          return { value, secondary: colDef.secondary ? row[colDef.secondary] : null };
      }
    };

    // Keep a reference to the real setState (before override)
    const _origSetState = comp.setState.bind(comp);

    // Override setState to intercept internal pagination button clicks
    // Internal pagination fires: this.setState({ meta: { ...meta, page: N } })
    // — no 'rows' key, only 'meta'. We intercept that and do a server fetch.
    comp.setState = async (partial: any, redraw = true) => {
      if (
        partial &&
        'meta' in partial &&
        !('rows' in partial) &&
        partial.meta?.page !== undefined &&
        partial.meta.page !== (comp.state.meta?.page)
      ) {
        const newPage = partial.meta.page;
        const newSkip = (newPage - 1) * pageSize;
        paginationState[sourceId] = { skip: newSkip, top: pageSize, page: newPage };
        const fs = filterState[sourceId] || {};
        try {
          const data = await refetchSource(sourceId, fs, newSkip, pageSize);
          _origSetState({ rows: data.data || [], meta: data.meta }, redraw);
        } catch (err) {
          console.error('[page-renderer] pagination fetch error:', err);
        }
        return;
      }
      _origSetState(partial, redraw);
    };

    // Wire action handler — ActionCell fires this.submit(actionId, { row })
    // which bubbles up via root._onAction to the GridView instance
    comp._onAction = async (actionId: string, params: any) => {
      const row = params?.row || params || {};
      const actionDef = (config.actions || []).find(a => a.id === actionId);
      if (actionDef) {
        await handleAction(actionDef, row);
      } else {
        console.warn(`[page-renderer] No action def found for: ${actionId}`);
      }
    };

    const slot = document.createElement('div');
    slot.style.marginBottom = '24px';
    targetContainer.appendChild(slot);
    comp.mount(slot);

    if (sourceId) {
      if (!boundComponents[sourceId]) boundComponents[sourceId] = [];
      boundComponents[sourceId].push({ comp, def, compType: 'GridView', _origSetState });
    }
  }

  async function renderDataGrid(def: any, targetContainer: HTMLElement) {
    const GridCtor = def.type === 'LineItemGrid'
      ? (await import('./components/LineItemGrid.ts')).LineItemGrid
      : def.type === 'ContactGrid'
        ? (await import('./components/ContactGrid.ts')).ContactGrid
        : (await import('./components/DataGrid.ts')).DataGrid;
    const sourceId = def.source;
    const sourceResult = dataMap[sourceId] || { data: [], meta: {} };
    const pageSize = def.page_size || 25;
    const pageSizeOptions = (def.page_size_options || [])
      .map(Number)
      .filter((value: number) => Number.isFinite(value) && value > 0);
    const columns = (def.columns || []).map((column: any, index: number) => ({
      id: column.id || column.field || `column-${index}`,
      field: column.field,
      label: column.label || '',
      align: column.align,
      sortable: column.sortable !== false,
      rowActions: column.actions?.map((action: any) => ({
        ...action,
        visible: (row: any) => {
          const actionDef = (config.actions || []).find((candidate: any) => candidate.id === action.id);
          const permission = action.permission || actionDef?.permission;
          return Boolean(!permission || ctx.user.permissions?.includes(permission))
            && (!action.show_if || Boolean(evalExpr(action.show_if, { ...ctx, row })));
        },
      })),
      render: column.type ? (cell: HTMLElement, value: unknown, row: any) => {
        if (def.tree && index === 0) {
          const depth = treeDepth(row);
          cell.style.paddingLeft = `${16 + depth * 20}px`;
          cell.dataset.treeDepth = String(depth);
        }
        if (column.type === 'StatusChip') {
          const chip = document.createElement('span');
          const tone = column.colors?.[String(value)] || column.tone || 'neutral';
          chip.className = `data-grid-status data-grid-status-${tone}`;
          chip.textContent = value == null || value === '' ? '—' : String(value);
          cell.appendChild(chip);
          return;
        }
        if (column.type === 'PrimaryEntityCell') {
          const entity = document.createElement('div');
          entity.className = 'data-grid-entity';
          if (column.avatar) {
            const avatar = document.createElement('span');
            avatar.className = 'data-grid-entity-avatar';
            avatar.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V6l8-3 8 3v14"/><path d="M8 20v-5h8v5M8 9h.01M12 9h.01M16 9h.01"/></svg>';
            entity.appendChild(avatar);
          }
          const copy = document.createElement('span');
          copy.className = 'data-grid-entity-copy';
          const primary = document.createElement('div');
          primary.className = 'data-grid-primary';
          primary.textContent = value == null || value === '' ? '—' : String(value);
          copy.appendChild(primary);
          if (column.secondary) {
            const secondary = document.createElement('div');
            secondary.className = 'data-grid-secondary';
            secondary.textContent = row[column.secondary] == null ? '' : String(row[column.secondary]);
            copy.appendChild(secondary);
          }
          entity.appendChild(copy);
          cell.appendChild(entity);
          return;
        }
        if (column.type === 'WeightCell') {
          cell.textContent = value == null || value === '' ? '—' : `${Number(value).toLocaleString()} ${column.unit || 'kg'}`;
          return;
        }
        if (column.type === 'DateCell') {
          if (value == null || value === '') {
            cell.textContent = '—';
            return;
          }
          const date = new Date(String(value));
          cell.textContent = Number.isNaN(date.valueOf())
            ? String(value)
            : new Intl.DateTimeFormat(column.locale || 'vi-VN', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              ...(String(value).includes('T') ? { hour: '2-digit', minute: '2-digit' } : {}),
            }).format(date);
          return;
        }
        cell.textContent = value == null || value === '' ? '—' : String(value);
      } : undefined,
    }));
    const componentActions = (def.actions || []).filter((action: any) => {
      if (action.permission && !ctx.user.permissions?.includes(action.permission)) return false;
      return !action.show_if || Boolean(evalExpr(action.show_if, ctx));
    });
    const reorder = def.reorder && typeof def.reorder === 'object' ? def.reorder : null;
    const reorderActions = reorder
      ? {
        up: (config.actions || []).find((action: any) => action.id === reorder.up_action),
        down: (config.actions || []).find((action: any) => action.id === reorder.down_action),
      }
      : null;
    const comp = new GridCtor(
      `data-grid-${sourceId || def.id || Date.now()}`,
      {
        rows: sourceResult.data || [],
        meta: {
          ...(sourceResult.meta || {}),
          title: def.title,
          description: def.description,
        },
        actions: componentActions,
        selectable: !!def.selectable,
        rowNumbers: def.row_numbers === true,
        emptyState: def.empty_state,
      },
      columns,
      {
        rowKey: def.row_key || 'id',
        selectable: !!def.selectable,
        columnChooser: def.column_chooser === true,
        rowNumbers: def.row_numbers === true,
        labels: config.locale === 'vi' ? {
          rowNumber: 'Số dòng',
          selectRow: (id: string) => `Chọn dòng ${id}`,
          expandRow: 'Mở rộng dòng',
          collapseRow: 'Thu gọn dòng',
          summaryOf: 'trên',
          previousPage: 'Trang trước',
          nextPage: 'Trang sau',
        } : undefined,
        pageSizeOptions,
        tree: def.tree ? { parentField: 'parent_id' } : undefined,
      onPageChange: async (page: number) => {
          const nextPage = Math.max(1, page);
          const currentPageSize = paginationState[sourceId]?.top || pageSize;
          const newSkip = (nextPage - 1) * currentPageSize;
          paginationState[sourceId] = { skip: newSkip, top: currentPageSize, page: nextPage };
          try {
            const data = await refetchSource(sourceId, filterState[sourceId] || {}, newSkip, currentPageSize);
            updateBoundComponents(sourceId, data);
          } catch (err) {
            console.error('[page-renderer] pagination fetch error:', err);
          }
        },
        onSort: async (sort: { field: string; direction: 'asc' | 'desc' }) => {
          sortState[sourceId] = sort;
          paginationState[sourceId] = { skip: 0, top: paginationState[sourceId]?.top || pageSize, page: 1 };
          try {
            const data = await refetchSource(sourceId, filterState[sourceId] || {}, 0, paginationState[sourceId].top, sort);
            updateBoundComponents(sourceId, data);
          } catch (err) {
            console.error('[page-renderer] sort fetch error:', err);
          }
        },
        onPageSizeChange: async (nextSize: number) => {
          paginationState[sourceId] = { skip: 0, top: nextSize, page: 1 };
          try {
            const data = await refetchSource(sourceId, filterState[sourceId] || {}, 0, nextSize);
            updateBoundComponents(sourceId, data);
          } catch (err) {
            console.error('[page-renderer] page-size fetch error:', err);
          }
        },
        onRowReorder: reorderActions?.up || reorderActions?.down
          ? async (fromRow: any, toRow: any) => {
            const rows = (dataMap[sourceId]?.data || []) as any[];
            const fromIndex = rows.findIndex(row => String(row?.id) === String(fromRow?.id));
            const toIndex = rows.findIndex(row => String(row?.id) === String(toRow?.id));
            if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
            const actionDef = fromIndex > toIndex ? reorderActions?.up : reorderActions?.down;
            if (!actionDef) return;
            for (let step = fromIndex; step !== toIndex; step += fromIndex > toIndex ? -1 : 1) {
              await handleAction(actionDef, fromRow);
            }
          }
          : undefined,
      }
    );

    const _origSetState = comp.setState.bind(comp);
    comp._onAction = async (actionId: string, params: any) => {
      const actionDef = (config.actions || []).find(action => action.id === actionId);
      if (actionDef) await handleAction(actionDef, params?.row || params || {});
    };

    const slot = document.createElement('div');
    slot.style.marginBottom = '24px';
    targetContainer.appendChild(slot);
    comp.mount(slot);

    if (sourceId) {
      if (!boundComponents[sourceId]) boundComponents[sourceId] = [];
      boundComponents[sourceId].push({ comp, def, compType: 'DataGrid', _origSetState });
    }
  }

  async function renderScheduleGrid(def: any, targetContainer: HTMLElement) {
    const { ScheduleGrid } = await import('./components/ScheduleGrid.ts');
    const sourceResult = dataMap[def.source] || { data: [] };
    const component = new ScheduleGrid(
      `schedule-grid-${def.source || def.id || Date.now()}`,
      { rows: Array.isArray(sourceResult.data) ? sourceResult.data : [] },
      def,
    );
    const slot = document.createElement('div');
    slot.style.marginBottom = '24px';
    targetContainer.appendChild(slot);
    component.mount(slot);
    if (def.source) {
      if (!boundComponents[def.source]) boundComponents[def.source] = [];
      boundComponents[def.source].push({ comp: component, def, compType: 'ScheduleGrid', _origSetState: component.setState.bind(component) });
    }
  }

  async function renderDocumentSummary(def: any, targetContainer: HTMLElement) {
    const { DocumentSummary } = await import('./components/DocumentSummary.ts');
    const sourceResult = dataMap[def.source] || { data: {} };
    const comp = new DocumentSummary(
      `document-summary-${def.source || def.id || Date.now()}`,
      { record: sourceResult.data || {} },
      def,
    );
    const slot = document.createElement('div');
    slot.style.marginBottom = '24px';
    targetContainer.appendChild(slot);
    comp.mount(slot);
    if (!boundComponents[def.source]) boundComponents[def.source] = [];
    boundComponents[def.source].push({
      comp,
      def,
      compType: 'SingleRecord',
      _origSetState: comp.setState.bind(comp),
    });
  }

  async function renderMoneySummary(def: any, targetContainer: HTMLElement) {
    const { MoneySummary } = await import('./components/MoneySummary.ts');
    const sourceResult = dataMap[def.source] || { data: {} };
    const comp = new MoneySummary(
      `money-summary-${def.source || def.id || Date.now()}`,
      { record: sourceResult.data || {} },
      def,
    );
    const slot = document.createElement('div');
    slot.style.marginBottom = '24px';
    targetContainer.appendChild(slot);
    comp.mount(slot);
    if (!boundComponents[def.source]) boundComponents[def.source] = [];
    boundComponents[def.source].push({
      comp,
      def,
      compType: 'SingleRecord',
      _origSetState: comp.setState.bind(comp),
    });
  }

  async function renderApprovalTimeline(def: any, targetContainer: HTMLElement) {
    const { ApprovalTimeline } = await import('./components/ApprovalTimeline.ts');
    const sourceResult = dataMap[def.source] || { data: [] };
    const comp = new ApprovalTimeline(
      `approval-timeline-${def.source || def.id || Date.now()}`,
      { events: sourceResult.data || [] },
      def,
    );
    const slot = document.createElement('div');
    slot.style.marginBottom = '24px';
    targetContainer.appendChild(slot);
    comp.mount(slot);
    if (!boundComponents[def.source]) boundComponents[def.source] = [];
    boundComponents[def.source].push({
      comp,
      def,
      compType: 'Timeline',
      _origSetState: comp.setState.bind(comp),
    });
  }

  async function renderChatWorkspace(def: any, targetContainer: HTMLElement) {
    const { ChatWorkspace } = await import('./components/ChatWorkspace.ts');
    const threadSource = def.source;
    const messageSource = def.message_source;
    const attachmentSource = def.attachment_source;
    const comp = new ChatWorkspace(
      `chat-workspace-${def.id || threadSource || Date.now()}`,
      {
        threads: dataMap[threadSource]?.data || [],
        messages: dataMap[messageSource]?.data || [],
        attachments: dataMap[attachmentSource]?.data || [],
        currentUserId: ctx.user.sub,
      },
      def,
    );
    if (def.refresh_interval_ms) {
      def.on_refresh = async () => {
        await refreshSources([threadSource, messageSource, attachmentSource].filter(Boolean));
      };
    }
    const _origSetState = comp.setState.bind(comp);
    comp._onAction = async (actionId: string, params: any) => {
      const actionDef = (config.actions || []).find(action => action.id === actionId);
      if (actionDef) await handleAction(actionDef, params?.row || params || {});
    };
    const slot = document.createElement('div');
    slot.style.marginBottom = '24px';
    targetContainer.appendChild(slot);
    comp.mount(slot);

    if (!boundComponents[threadSource]) boundComponents[threadSource] = [];
    boundComponents[threadSource].push({
      comp,
      def,
      compType: 'ChatThreads',
      _origSetState,
    });
    if (!boundComponents[messageSource]) boundComponents[messageSource] = [];
    boundComponents[messageSource].push({
      comp,
      def,
      compType: 'ChatMessages',
      _origSetState,
    });
    if (!boundComponents[attachmentSource]) boundComponents[attachmentSource] = [];
    boundComponents[attachmentSource].push({
      comp,
      def,
      compType: 'ChatAttachments',
      _origSetState,
    });
  }

  async function renderStatusTabs(def: any, targetContainer: HTMLElement) {
    const { StatusTabs } = await import('./components/StatusTabs.ts');
    const sourceResult = def.source ? dataMap[def.source] || {} : {};
    const rows = Array.isArray(sourceResult.data) ? sourceResult.data : [];
    const field = def.filter_field || 'status';
    let facets: Record<string, number> = {};
    let facetTotal: number | undefined;
    if (def.source && def.show_counts !== false) {
      const filters = { ...(filterState[def.source] || {}) };
      delete filters[field];
      try {
        const facetResult = await client.query(createQuery({
          sourceId: def.source,
          params: { ...pageParams, ...filters },
          skip: 0,
          top: 1,
          facetField: field,
        }));
        facets = facetResult.meta?.facets || {};
        facetTotal = Number(facetResult.meta?.total ?? 0);
      } catch (error) {
        console.error(`[page-renderer] status facet error for "${def.source}":`, error);
      }
    }
    const tabs = (def.tabs || []).map((tab: any) => {
      if (tab.count !== undefined) return tab;
      const count = tab.id === ''
        ? facetTotal ?? Number(sourceResult.meta?.total ?? rows.length)
        : facets[String(tab.id)] ?? rows.filter((row: any) => String(row[field] ?? '') === String(tab.id)).length;
      return { ...tab, count };
    });
    const comp = new StatusTabs(
      `status-tabs-${def.source || def.id || Date.now()}`,
      { active: def.active || tabs[0]?.id },
      tabs,
      { showCounts: def.show_counts !== false, variant: def.variant || 'tabs' },
    );
    comp._onAction = async (_actionId: string, params: any) => {
      const sourceId = def.source;
      if (!sourceId) return;
      const field = def.filter_field || 'status';
      const next = { ...(filterState[sourceId] || {}), [field]: params?.status };
      await applySourceFilters(sourceId, next);
    };
    const slot = document.createElement('div');
    slot.style.marginBottom = '16px';
    targetContainer.appendChild(slot);
    comp.mount(slot);
    if (def.source) {
      if (!boundComponents[def.source]) boundComponents[def.source] = [];
      boundComponents[def.source].push({ comp, def, compType: 'StatusTabs' });
    }
  }

  async function renderListToolbar(def: any, targetContainer: HTMLElement) {
    const { ListToolbar } = await import('./components/ListToolbar.ts');
    const filters = (def.filters || []).map((filter: any) => {
      if (!filter.options_source) return filter;
      const rows = dataMap[filter.options_source]?.data;
      return {
        ...filter,
        options: Array.isArray(rows)
          ? rows.map((row: any) => ({ id: String(row.value ?? row.id ?? ''), label: String(row.label ?? row.name ?? row.value ?? row.id ?? '') }))
          : [],
      };
    });
    const comp = new ListToolbar(
      `list-toolbar-${def.source || def.id || Date.now()}`,
      { ...(filterState[def.source || ''] || {}), query: filterState[def.source || '']?.[def.filter_field || 'q'] || '', preset: def.date_range?.default_preset },
      { search: def.search, search_button: def.search_button, actions: def.actions, date_range: def.date_range, filters, filter_sources: def.filter_sources, advanced_filter: def.advanced_filter, help: def.help, actions_inline: def.actions_inline }
    );
    comp._onAction = async (actionId: string, params: any) => {
      const sourceId = def.source;
      if (!sourceId) return;
      if (actionId === 'search' || actionId === def.search?.action) {
        const field = def.filter_field || 'q';
        await applySourceFilters(sourceId, { ...(filterState[sourceId] || {}), [field]: params?.query || '' });
        return;
      }
      if (actionId === 'date-range') {
        const targets = def.filter_sources || [sourceId];
        for (const target of targets) await applySourceFilters(target, { ...(filterState[target] || {}), ...params });
        return;
      }
      if (actionId === 'filter') {
        await applySourceFilters(sourceId, { ...(filterState[sourceId] || {}), ...params });
        return;
      }
      if (actionId.endsWith('.export')) {
        const { downloadCsv, toCsv } = await import('./list-utils.ts');
        const { downloadXlsx, toXlsx } = await import('./xlsx-utils.ts');
        const grid = (config.components || []).find(component => component.type === 'DataGrid' && component.source === sourceId);
        const columns = (grid?.columns || []).filter(column => column.field && column.field !== 'actions');
        const current = dataMap[sourceId] || { data: [], meta: {} };
        const total = Math.max(Number(current.meta?.total) || 0, Array.isArray(current.data) ? current.data.length : 0);
        const exportRows: any[] = [];
        const exportPageSize = 100;
        try {
          for (let skip = 0; skip < total; skip += exportPageSize) {
            const result = await client.query(createQuery({
              sourceId,
              params: { ...pageParams, ...(filterState[sourceId] || {}) },
              skip,
              top: exportPageSize,
            }));
            exportRows.push(...(Array.isArray(result?.data) ? result.data : []));
            if (!result?.data?.length) break;
          }
        } catch (error) {
          console.error(`[page-renderer] Export fetch failed for "${sourceId}"`, error);
        }
        const rows = exportRows.length ? exportRows : (current.data || []);
        if (params?.format === 'csv') downloadCsv(`${config.page?.id || sourceId}-export`, toCsv(rows, columns));
        else downloadXlsx(`${config.page?.id || sourceId}-export`, toXlsx(rows, columns));
        return;
      }
      const actionDef = (config.actions || []).find(action => action.id === actionId);
      if (actionDef) await handleAction(actionDef, params || {});
    };
    const slot = document.createElement('div');
    slot.style.marginBottom = '16px';
    targetContainer.appendChild(slot);
    comp.mount(slot);
  }

  function chartState(def: any, sourceResult: any) {
    const rows = Array.isArray(sourceResult?.data) ? sourceResult.data : [];
    const labelField = def.label_field || 'label';
    const valueField = def.value_field || 'value';
    return {
      title: def.title || '',
      labels: rows.map((row: any) => String(row[labelField] ?? '—')),
      data: rows.map((row: any) => Number(row[valueField]) || 0),
      series: (def.series || []).map((item: any) => ({
        label: item.label || item.field,
        color: item.color,
        data: rows.map((row: any) => Number(row[item.field]) || 0),
      })),
    };
  }

  async function renderChart(def: any, targetContainer: HTMLElement) {
    const { Chart } = await import('./components/Chart.ts');
    const sourceResult = def.source ? dataMap[def.source] : { data: def.rows || [] };
    const comp = new Chart(
      `chart-${def.source || def.id || Date.now()}`,
      chartState(def, sourceResult),
      def
    );

    const slot = document.createElement('div');
    slot.style.marginBottom = '24px';
    if (def.layout === 'inline') {
      slot.style.display = 'inline-block';
      slot.style.verticalAlign = 'top';
      slot.style.marginRight = '16px';
    }
    targetContainer.appendChild(slot);
    comp.mount(slot);

    if (def.source) {
      if (!boundComponents[def.source]) boundComponents[def.source] = [];
      boundComponents[def.source].push({ comp, def, compType: 'Chart', _origSetState: null });
    }
  }

  async function renderTabGroupDef(def: any, targetContainer: HTMLElement) {
    const userPerms = ctx.user.permissions || [];
    const visibleTabs = (def.tabs || []).filter(tab =>
      !tab.permission || userPerms.includes(tab.permission)
    );
    if (!visibleTabs.length) return;

    // Pre-render each tab's components into detached containers
    const tabContainers = [];
    for (const tab of visibleTabs) {
      const tabEl = document.createElement('div');
      for (const nestedDef of (tab.components || [])) {
        await renderComponentDef(nestedDef, tabEl);
      }
      tabContainers.push(tabEl);
    }

    // Build tab UI with plain DOM
    const wrap = document.createElement('div');
    wrap.className = 'core3-tab-group';

    const tabBar = document.createElement('div');
    tabBar.className = 'core3-tab-bar';
    tabBar.setAttribute('role', 'tablist');

    const panels = tabContainers.map((tc, i) => {
      const panel = document.createElement('div');
      panel.className = `core3-tab-panel${i === 0 ? '' : ' core3-tab-panel-hidden'}`;
      panel.id = `${config.page.id}-tab-panel-${i}`;
      panel.setAttribute('role', 'tabpanel');
      panel.appendChild(tc);
      return panel;
    });

    const tabBtns = visibleTabs.map((tab, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = tab.label;
      btn.className = `core3-tab-button${i === 0 ? ' is-active' : ''}`;
      btn.setAttribute('aria-selected', String(i === 0));
      btn.setAttribute('role', 'tab');
      btn.id = `${config.page.id}-tab-${i}`;
      btn.setAttribute('aria-controls', panels[i].id);
      panels[i].setAttribute('aria-labelledby', btn.id);
      return btn;
    });

    tabBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b, j) => {
          b.classList.toggle('is-active', j === i);
          b.setAttribute('aria-selected', String(j === i));
          panels[j].classList.toggle('core3-tab-panel-hidden', j !== i);
        });
      });
      tabBar.appendChild(btn);
    });

    wrap.appendChild(tabBar);
    panels.forEach(p => wrap.appendChild(p));
    targetContainer.appendChild(wrap);
  }

  async function renderComponentDef(def: any, targetContainer: HTMLElement) {
    switch (def.type) {
      case 'LoginForm': {
        const { LoginForm } = await import('./components/LoginForm.ts');
        const component = new LoginForm(def.id || `${config.page.id}-login`, {}, def);
        component._onAction = async (actionId: string, params: any) => {
          const actionDef = (config.actions || []).find((action: any) => action.id === actionId);
          if (actionDef) await handleAction(actionDef, params);
        };
        const slot = document.createElement('div');
        targetContainer.appendChild(slot);
        component.mount(slot);
        break;
      }
      case 'PageIntro': {
        const { PageIntro } = await import('./components/PageIntro.ts');
        const component = new PageIntro(def.id || `${config.page.id}-intro`, def);
        const slot = document.createElement('div');
        targetContainer.appendChild(slot);
        component.mount(slot);
        break;
      }
      case 'ComingSoon': {
        const { ComingSoon } = await import('./components/ComingSoon.ts');
        const component = new ComingSoon(def.id || `${config.page.id}-coming-soon`, def);
        const slot = document.createElement('div');
        targetContainer.appendChild(slot);
        component.mount(slot);
        break;
      }
      case 'StatRow':
        await renderStatRow(def, targetContainer);
        break;
      case 'GridView':
        await renderGridView(def, targetContainer);
        break;
      case 'DataGrid':
        await renderDataGrid(def, targetContainer);
        break;
      case 'ScheduleGrid':
        await renderScheduleGrid(def, targetContainer);
        break;
      case 'LineItemGrid':
        await renderDataGrid(def, targetContainer);
        break;
      case 'ContactGrid':
        await renderDataGrid(def, targetContainer);
        break;
      case 'DocumentSummary':
        await renderDocumentSummary(def, targetContainer);
        break;
      case 'MoneySummary':
        await renderMoneySummary(def, targetContainer);
        break;
      case 'ApprovalTimeline':
        await renderApprovalTimeline(def, targetContainer);
        break;
      case 'TemplatePreview':
        await renderTemplatePreview(def, targetContainer);
        break;
      case 'ChatWorkspace':
        await renderChatWorkspace(def, targetContainer);
        break;
      case 'StatusTabs':
        await renderStatusTabs(def, targetContainer);
        break;
      case 'ListToolbar':
        await renderListToolbar(def, targetContainer);
        break;
      case 'TabGroup':
        await renderTabGroupDef(def, targetContainer);
        break;
      case 'Chart':
        await renderChart(def, targetContainer);
        break;
      default:
        // Fall back to component registry for any custom types
        if (registry.has(def.type)) {
          const Ctor: any = registry.get(def.type);
          const sourceData = def.source ? (dataMap[def.source] || {}) : {};
          const comp = new Ctor(def.id || def.type, sourceData, def);
          comp._onAction = async (actionId: string, params: any) => {
            const row = params?.row || params || {};
            const actionDef = (config.actions || []).find(a => a.id === actionId);
            if (actionDef) await handleAction(actionDef, row);
          };
          const slot = document.createElement('div');
          slot.style.marginBottom = '24px';
          targetContainer.appendChild(slot);
          comp.mount(slot);
        } else {
          console.warn(`[page-renderer] Unknown component type: ${def.type}`);
        }
    }
  }

  async function renderTemplatePreview(def: any, targetContainer: HTMLElement) {
    const { TemplatePreview } = await import('./components/TemplatePreview.ts');
    const component = new TemplatePreview(
      `template-preview-${def.id || def.source || Date.now()}`,
      {
        template: (dataMap[def.template_source]?.data || {}) as Record<string, unknown>,
        blocks: (dataMap[def.source]?.data || []) as Array<Record<string, unknown>>,
      },
    );
    const slot = document.createElement('div');
    slot.style.marginBottom = '24px';
    targetContainer.appendChild(slot);
    component.mount(slot);
    if (def.source) {
      if (!boundComponents[def.source]) boundComponents[def.source] = [];
      boundComponents[def.source].push({
        comp: component,
        def,
        compType: 'TemplatePreview',
        _origSetState: component.setState.bind(component),
      });
    }
  }

  // ── Build page DOM ────────────────────────────────────────────────────────

  container.innerHTML = '';
  const pageDiv = document.createElement('div');
  pageDiv.className = 'tms-page';
  container.appendChild(pageDiv);

  // Set document title
  if (config.title) document.title = config.title;

  // 5. Render the optional reference-style breadcrumb/page header.
  let pageHeader: HTMLElement | null = null;
  if (config.page?.breadcrumb?.length) {
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
      const crumb = document.createElement('span');
      crumb.className = index === config.page.breadcrumb.length - 1 ? 'page-breadcrumb-current' : 'page-breadcrumb-link';
      crumb.textContent = item;
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

  // 6. Render toolbar
  if (config.toolbar?.length) {
    const toolbarDiv = document.createElement('div');
    toolbarDiv.className = pageHeader ? 'page-header-actions' : 'page-toolbar';
    toolbarDiv.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;';

    for (const btn of config.toolbar) {
      if (btn.show_if && !Boolean(evalExpr(btn.show_if, ctx))) continue;
      if (btn.permission) {
        const userPerms = ctx.user.permissions || [];
        if (!userPerms.includes(btn.permission)) continue;
      }
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
        const actionDef = (config.actions || []).find(a => a.id === btn.action);
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

  // 7. Render filter bar
  if (config.filters) {
    const { FilterBar } = await import('./components/FilterBar.ts');
    const filterSourceId = config.filters.source;
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

    filterBar._onAction = async (actionId, params) => {
      let values = {};
      if (actionId === 'filter.change') {
        values = params?.values || {};
      } else if (actionId === 'filter.clear') {
        values = {};
      } else {
        return;
      }

      await applySourceFilters(filterSourceId, values);
    };

    filterBar.mount(filterSlot);
  }

  // 8. Render components
  for (const def of (config.components || [])) {
    await renderComponentDef(def, pageDiv);
  }

  return { dataMap, ctx };
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
      return;
    }
    sources.set(id, {
      id,
      single: def.single ?? def.type === 'StatRow',
      page_size: def.page_size,
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
