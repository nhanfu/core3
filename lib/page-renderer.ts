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
  const pageParams = getPageParams();
  const ctx: any = { user, row: {}, state: pageParams };

  // 3. Fetch datasources
  const dataMap: Record<string, any> = {};
  const filterState: Record<string, any> = {};    // sourceId -> current filter values object
  const paginationState: Record<string, any> = {}; // sourceId -> { skip, top, page }
  // boundComponents: sourceId -> [{ comp, def, compType: 'GridView'|'DataGrid'|'StatRow'|'Chart' }]
  const boundComponents: Record<string, any[]> = {};

  const sourceDefs = collectSources(config);
  for (const src of sourceDefs.values()) {
    const pageSize = src.page_size || 25;
    paginationState[src.id] = { skip: 0, top: pageSize, page: 1 };
    filterState[src.id] = {};
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

  async function refetchSource(sourceId: string, filters = {}, skip = 0, top = 25) {
    const result = await client.query(
      createQuery({ sourceId, params: { ...pageParams, ...filters }, skip, top })
    );
    dataMap[sourceId] = result;
    if (result?.data && !Array.isArray(result.data)) {
      ctx.state = { ...ctx.state, [sourceId]: result.data };
    }
    return result;
  }

  function updateBoundComponents(sourceId: string, data: any) {
    for (const entry of (boundComponents[sourceId] || [])) {
      if (entry.compType === 'GridView' || entry.compType === 'DataGrid') {
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
      } else if (entry.compType === 'Timeline') {
        entry._origSetState({ events: data.data || [] }, true);
      } else if (entry.compType === 'ChatThreads') {
        entry._origSetState({ threads: data.data || [] }, true);
      } else if (entry.compType === 'ChatMessages') {
        entry._origSetState({ messages: data.data || [] }, true);
      } else if (entry.compType === 'ChatAttachments') {
        entry._origSetState({ attachments: data.data || [] }, true);
      }
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

  async function handleAction(actionDef: any, row: any) {
    if (!actionDef) return;
    const rowCtx = { ...ctx, row: row || {} };
    const resolved = resolveAction(actionDef, rowCtx);
    if (!resolved.visible) return;

    switch (actionDef.type) {
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
          await client.action(actionDef.action, {
            id: row?.id ?? null,
            ...resolveActionParams(actionDef.params, rowCtx),
          });
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
      // Overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'background:rgba(0,0,0,.45)',
        'z-index:1000',
        'display:flex',
        'align-items:center',
        'justify-content:center',
      ].join(';') + ';';

      // Dialog
      const dialog = document.createElement('div');
      dialog.style.cssText = [
        'background:#fff',
        'border-radius:12px',
        'padding:28px',
        'width:480px',
        'max-width:95vw',
        'max-height:90vh',
        'overflow-y:auto',
        'box-shadow:0 25px 50px rgba(0,0,0,.2)',
      ].join(';') + ';';

      // Header
      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;';

      const titleEl = document.createElement('h2');
      titleEl.style.cssText = 'font-size:1.125rem;font-weight:600;color:#111827;margin:0;';
      titleEl.textContent = actionDef.title || '';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1.25rem;color:#9ca3af;padding:0;line-height:1;';
      closeBtn.type = 'button';

      header.appendChild(titleEl);
      header.appendChild(closeBtn);
      dialog.appendChild(header);

      // Fields
      const inputs: Record<string, { el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement; fieldDef: any }> = {}; // field -> { el, fieldDef }
      for (const fieldDef of (actionDef.fields || [])) {
        const group = document.createElement('div');
        group.style.cssText = 'margin-bottom:16px;';

        const label = document.createElement('label');
        label.style.cssText = 'display:block;font-size:0.875rem;font-weight:500;color:#374151;margin-bottom:4px;';
        label.textContent = fieldDef.label + (fieldDef.required ? ' *' : '');
        group.appendChild(label);

        let el;
        if (fieldDef.type === 'select') {
          el = document.createElement('select');
          el.className = 'form-select';
          el.style.cssText = 'width:100%;box-sizing:border-box;';

          const emptyOpt = document.createElement('option');
          emptyOpt.value = '';
          emptyOpt.textContent = 'Select…';
          el.appendChild(emptyOpt);

          for (const opt of (fieldDef.options || [])) {
            const optEl = document.createElement('option');
            optEl.value = String(opt);
            optEl.textContent = String(opt);
            el.appendChild(optEl);
          }
        } else if (fieldDef.type === 'textarea') {
          el = document.createElement('textarea');
          el.className = 'form-input';
          el.style.cssText = 'width:100%;height:72px;box-sizing:border-box;resize:vertical;';
        } else {
          el = document.createElement('input');
          el.type = fieldDef.type || 'text';
          el.className = 'form-input';
          el.style.cssText = 'width:100%;box-sizing:border-box;';
        }

        // Determine initial value
        let initialValue = fieldDef.default ?? '';
        const prefillRecord = actionDef.prefill === 'source'
          ? dataMap[actionDef.prefill_source || '']?.data
          : row;
        if ((actionDef.prefill === 'row' || actionDef.prefill === 'source') && prefillRecord) {
          initialValue = prefillRecord[fieldDef.field] ?? fieldDef.default ?? '';
        }
        // Date inputs must be YYYY-MM-DD
        if (fieldDef.type === 'date' && initialValue && typeof initialValue === 'string') {
          initialValue = initialValue.slice(0, 10);
        }
        el.value = String(initialValue ?? '');

        group.appendChild(el);
        dialog.appendChild(group);
        inputs[fieldDef.field] = { el, fieldDef };
      }

      // Footer
      const footer = document.createElement('div');
      footer.style.cssText = 'display:flex;justify-content:flex-end;gap:12px;margin-top:24px;';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Cancel';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'btn btn-primary';
      saveBtn.textContent = 'Save';

      footer.appendChild(cancelBtn);
      footer.appendChild(saveBtn);
      dialog.appendChild(footer);

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Error banner (created lazily)
      let errorBanner: HTMLElement | null = null;

      function showError(msg: string) {
        if (!errorBanner) {
          errorBanner = document.createElement('div');
          errorBanner.style.cssText = 'margin-top:12px;padding:10px 14px;background:#fef2f2;color:#b91c1c;border-radius:6px;font-size:0.875rem;border:1px solid #fecaca;';
          footer.insertAdjacentElement('beforebegin', errorBanner);
        }
        errorBanner.textContent = msg;
        errorBanner.style.display = '';
      }

      function closeModal() {
        if (document.body.contains(overlay)) document.body.removeChild(overlay);
        resolve();
      }

      closeBtn.addEventListener('click', closeModal);
      cancelBtn.addEventListener('click', closeModal);
      overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

      saveBtn.addEventListener('click', async () => {
        // Reset error
        if (errorBanner) errorBanner.style.display = 'none';

        // Validate required fields
        let firstInvalid: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null = null;
        for (const { el, fieldDef } of Object.values(inputs)) {
          const v = el.value?.trim() ?? '';
          if (fieldDef.required && !v) {
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
          value: el.value,
        }));

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving…';
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
              id: row?.id ?? null,
              scope: actionDef.scope,
              changes,
            });
          }
          closeModal();
          if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
        } catch (err: any) {
          console.error('[page-renderer] patch error:', err);
          showError(err.message || 'Save failed. Please try again.');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
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

    const comp = new StatRow(`stat-row-${def.source || Date.now()}`, mappedStats);
    const slot = document.createElement('div');
    slot.style.marginBottom = '24px';
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
    const pageSize = def.page_size || 25;

    // Add an `id` to each column def for GridView's cell lookup key
    const columnDefs = (def.columns || []).map((col, i) => ({
      ...col,
      id: col.field || `col-${i}`,
    }));

    const comp = new GridView(
      `grid-${sourceId || Date.now()}`,
      { rows: sourceResult.data || [], meta: sourceResult.meta },
      columnDefs
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
            !a.show_if || evalExpr(a.show_if, rowCtx)
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
    const columns = (def.columns || []).map((column: any, index: number) => ({
      id: column.id || column.field || `column-${index}`,
      field: column.field,
      label: column.label || '',
      align: column.align,
      sortable: column.sortable !== false,
      rowActions: column.actions?.map((action: any) => ({
        ...action,
        visible: action.show_if
          ? (row: any) => Boolean(evalExpr(action.show_if, { ...ctx, row }))
          : undefined,
      })),
      render: column.type ? (cell: HTMLElement, value: unknown, row: any) => {
        if (column.type === 'StatusChip') {
          const chip = document.createElement('span');
          const tone = column.colors?.[String(value)] || column.tone || 'neutral';
          chip.className = `data-grid-status data-grid-status-${tone}`;
          chip.textContent = value == null || value === '' ? '—' : String(value);
          cell.appendChild(chip);
          return;
        }
        if (column.type === 'PrimaryEntityCell') {
          const primary = document.createElement('div');
          primary.className = 'data-grid-primary';
          primary.textContent = value == null || value === '' ? '—' : String(value);
          cell.appendChild(primary);
          if (column.secondary) {
            const secondary = document.createElement('div');
            secondary.className = 'data-grid-secondary';
            secondary.textContent = row[column.secondary] == null ? '' : String(row[column.secondary]);
            cell.appendChild(secondary);
          }
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
        emptyState: def.empty_state,
      },
      columns,
      {
        rowKey: def.row_key || 'id',
        selectable: !!def.selectable,
        columnChooser: def.column_chooser === true,
        onPageChange: async (page: number) => {
          const nextPage = Math.max(1, page);
          const newSkip = (nextPage - 1) * pageSize;
          paginationState[sourceId] = { skip: newSkip, top: pageSize, page: nextPage };
          try {
            const data = await refetchSource(sourceId, filterState[sourceId] || {}, newSkip, pageSize);
            updateBoundComponents(sourceId, data);
          } catch (err) {
            console.error('[page-renderer] pagination fetch error:', err);
          }
        },
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
    const comp = new StatusTabs(
      `status-tabs-${def.source || def.id || Date.now()}`,
      { active: def.active || def.tabs?.[0]?.id },
      def.tabs || []
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
  }

  async function renderListToolbar(def: any, targetContainer: HTMLElement) {
    const { ListToolbar } = await import('./components/ListToolbar.ts');
    const comp = new ListToolbar(
      `list-toolbar-${def.source || def.id || Date.now()}`,
      { ...(filterState[def.source || ''] || {}), query: filterState[def.source || '']?.[def.filter_field || 'q'] || '' },
      { search: def.search, actions: def.actions, date_range: def.date_range, filters: def.filters, filter_sources: def.filter_sources }
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
        const grid = (config.components || []).find(component => component.type === 'DataGrid' && component.source === sourceId);
        const columns = (grid?.columns || []).filter(column => column.field && column.field !== 'actions');
        downloadCsv(`${config.page?.id || sourceId}-export`, toCsv(dataMap[sourceId]?.data || [], columns));
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
    wrap.style.marginBottom = '24px';

    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;border-bottom:1px solid #e5e7eb;gap:0;';

    const panels = tabContainers.map((tc, i) => {
      const panel = document.createElement('div');
      panel.style.cssText = `padding-top:16px;${i === 0 ? '' : 'display:none;'}`;
      panel.appendChild(tc);
      return panel;
    });

    const tabBtns = visibleTabs.map((tab, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = tab.label;
      btn.style.cssText = [
        'padding:10px 16px',
        'font-size:0.875rem',
        'border:none',
        'background:none',
        'cursor:pointer',
        `border-bottom:2px solid ${i === 0 ? '#4f46e5' : 'transparent'}`,
        `color:${i === 0 ? '#4338ca' : '#6b7280'}`,
        `font-weight:${i === 0 ? '600' : '500'}`,
        'margin-bottom:-1px',
        'transition:color 0.15s,border-color 0.15s',
      ].join(';') + ';';
      return btn;
    });

    tabBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        tabBtns.forEach((b, j) => {
          b.style.borderBottomColor = j === i ? '#4f46e5' : 'transparent';
          b.style.color = j === i ? '#4338ca' : '#6b7280';
          b.style.fontWeight = j === i ? '600' : '500';
          panels[j].style.display = j === i ? '' : 'none';
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

  // ── Build page DOM ────────────────────────────────────────────────────────

  container.innerHTML = '';
  const pageDiv = document.createElement('div');
  pageDiv.className = 'tms-page';
  container.appendChild(pageDiv);

  // Set document title
  if (config.title) document.title = config.title;

  // 5. Render toolbar
  if (config.toolbar?.length) {
    const toolbarDiv = document.createElement('div');
    toolbarDiv.className = 'page-toolbar';
    toolbarDiv.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-bottom:20px;flex-wrap:wrap;';

    for (const btn of config.toolbar) {
      if (btn.permission) {
        const userPerms = ctx.user.permissions || [];
        if (!userPerms.includes(btn.permission)) continue;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn btn-${btn.variant || 'secondary'}`;
      button.textContent = btn.label;
      button.addEventListener('click', async () => {
        const actionDef = (config.actions || []).find(a => a.id === btn.action);
        if (actionDef) await handleAction(actionDef, null);
        else console.warn(`[page-renderer] Toolbar action not found: ${btn.action}`);
      });
      toolbarDiv.appendChild(button);
    }

    pageDiv.appendChild(toolbarDiv);
  }

  // 6. Render filter bar
  if (config.filters) {
    const { FilterBar } = await import('./components/FilterBar.ts');
    const filterSourceId = config.filters.source;

    const filterSlot = document.createElement('div');
    filterSlot.style.marginBottom = '20px';
    pageDiv.appendChild(filterSlot);

    const filterBar = new FilterBar(
      'page-filter-bar',
      { values: {} },
      config.filters.fields || []
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

  // 7. Render components
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
    sources.set(id, { id, single: def.type === 'StatRow', page_size: def.page_size });
  };
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
  return sources;
}
