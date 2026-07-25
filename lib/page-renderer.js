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
 *   import { renderPage } from '/lib/page-renderer.js';
 *   const config = jsyaml.load(yamlString);
 *   await renderPage(config, { container: outlet });
 */

import { evalExpr, interpolate } from './expr.js';
import { resolveAction } from './meta.js';
import { navigate, getPageParams } from './navigate.js';

// ── Component registry ────────────────────────────────────────────────────────

const registry = new Map();

export function register(name, Ctor) {
  registry.set(name, Ctor);
}

export function registerAll(map) {
  for (const [k, v] of Object.entries(map)) registry.set(k, v);
}

// ── Main render function ──────────────────────────────────────────────────────

export async function renderPage(config, { container = document.body } = {}) {
  // Dynamic imports to avoid circular deps
  const { client } = await import('./client.js');
  const { createQuery } = await import('./dtos.js');

  // 1. Auth check
  const user = window.__CORE3_USER__ || {};
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
  const ctx = { user, row: {}, state: pageParams };

  // 3. Fetch datasources
  const dataMap = {};
  const filterState = {};    // sourceId -> current filter values object
  const paginationState = {}; // sourceId -> { skip, top, page }
  // boundComponents: sourceId -> [{ comp, def, compType: 'GridView'|'StatRow' }]
  const boundComponents = {};

  for (const src of (config.datasources || [])) {
    const pageSize = src.page_size || 25;
    paginationState[src.id] = { skip: 0, top: pageSize, page: 1 };
    filterState[src.id] = {};
    try {
      const result = await client.query(
        createQuery({ sourceId: src.id, params: {}, skip: 0, top: pageSize })
      );
      dataMap[src.id] = result;
    } catch (err) {
      console.error(`[page-renderer] Failed to load datasource "${src.id}":`, err);
      dataMap[src.id] = { data: src.single ? {} : [], meta: { total: 0, page: 1, pageSize } };
    }
  }

  // ── Shared helpers (closures over dataMap, filterState, paginationState) ──

  async function refetchSource(sourceId, filters = {}, skip = 0, top = 25) {
    const result = await client.query(
      createQuery({ sourceId, params: filters, skip, top })
    );
    dataMap[sourceId] = result;
    return result;
  }

  function updateBoundComponents(sourceId, data) {
    for (const entry of (boundComponents[sourceId] || [])) {
      if (entry.compType === 'GridView') {
        // Use the internal setState via our stored reference (bypasses the override)
        entry._origSetState({ rows: data.data || [], meta: data.meta }, true);
      } else if (entry.compType === 'StatRow') {
        const sourceData = data.data || {};
        const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
        entry.comp.stats = (entry.def.stats || []).map(s => ({ ...s, value: getPath(sourceData, s.field) }));
        entry.comp.redraw();
      }
    }
  }

  async function refreshSources(sourceIds) {
    for (const sourceId of (sourceIds || [])) {
      const ps = paginationState[sourceId] || { skip: 0, top: 25, page: 1 };
      const fs = filterState[sourceId] || {};
      const data = await refetchSource(sourceId, fs, ps.skip, ps.top);
      updateBoundComponents(sourceId, data);
    }
  }

  // ── Action handler ────────────────────────────────────────────────────────

  async function handleAction(actionDef, row) {
    if (!actionDef) return;
    const rowCtx = { ...ctx, row: row || {} };
    const resolved = resolveAction(actionDef, rowCtx);
    if (!resolved.visible) return;

    switch (actionDef.type) {
      case 'form':
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

      case 'navigate':
        navigate(
          actionDef.navigate_to,
          actionDef.params
            ? evalExpr(`(${JSON.stringify(actionDef.params)})`, { ...ctx, row: row || {} })
            : {}
        );
        break;

      default:
        console.warn(`[page-renderer] Unknown action type: ${actionDef.type}`);
    }
  }

  // ── Form modal ────────────────────────────────────────────────────────────

  async function openFormModal(actionDef, row) {
    return new Promise(resolve => {
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
      const inputs = {}; // field -> { el, fieldDef }
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
        if (actionDef.prefill === 'row' && row) {
          initialValue = row[fieldDef.field] ?? fieldDef.default ?? '';
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
      let errorBanner = null;

      function showError(msg) {
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
        let firstInvalid = null;
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
          await client.patch({
            table: actionDef.table,
            action: actionDef.operation,
            id: row?.id ?? null,
            changes,
          });
          closeModal();
          if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
        } catch (err) {
          console.error('[page-renderer] patch error:', err);
          showError(err.message || 'Save failed. Please try again.');
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        }
      });
    });
  }

  // ── Component renderers ───────────────────────────────────────────────────

  async function renderStatRow(def, targetContainer) {
    const { StatRow } = await import('./components/StatRow.js');
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

  async function renderGridView(def, targetContainer) {
    const { GridView } = await import('./components/GridView.js');
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
    comp._cellState = (colDef, row) => {
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
          const visibleActions = (colDef.actions || []).filter(a =>
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
    comp.setState = async (partial, redraw = true) => {
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
    comp._onAction = async (actionId, params) => {
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

  async function renderTabGroupDef(def, targetContainer) {
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

  async function renderComponentDef(def, targetContainer) {
    switch (def.type) {
      case 'StatRow':
        await renderStatRow(def, targetContainer);
        break;
      case 'GridView':
        await renderGridView(def, targetContainer);
        break;
      case 'TabGroup':
        await renderTabGroupDef(def, targetContainer);
        break;
      default:
        // Fall back to component registry for any custom types
        if (registry.has(def.type)) {
          const Ctor = registry.get(def.type);
          const sourceData = def.source ? (dataMap[def.source] || {}) : {};
          const comp = new Ctor(def.id || def.type, sourceData, def);
          comp._onAction = async (actionId, params) => {
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
    const { FilterBar } = await import('./components/FilterBar.js');
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

      filterState[filterSourceId] = values;
      paginationState[filterSourceId] = {
        skip: 0,
        top: paginationState[filterSourceId]?.top || 25,
        page: 1,
      };

      try {
        const data = await refetchSource(
          filterSourceId,
          values,
          0,
          paginationState[filterSourceId].top
        );
        updateBoundComponents(filterSourceId, data);
      } catch (err) {
        console.error('[page-renderer] filter fetch error:', err);
      }
    };

    filterBar.mount(filterSlot);
  }

  // 7. Render components
  for (const def of (config.components || [])) {
    await renderComponentDef(def, pageDiv);
  }

  return { dataMap, ctx };
}
