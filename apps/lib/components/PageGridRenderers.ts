import { evalExpr } from '../expr.ts';
import { hasPermission } from '../meta.ts';
import { navigate, getPageParams, replaceParams } from '../navigate.ts';
import { BaseComponent } from './BaseComponent.ts';

export class PageGridRenderers extends BaseComponent {
  readonly renderers: any;

  constructor(deps: any) {
    super('page-grid-renderers');
    this.renderers = this.createRenderers(deps);
  }

  private createRenderers(deps: any) {
  const { config, dataMap, ctx, bindSource, sortState, paginationState, filterState, pageParams, refetchSource, updateBoundComponents, client, createQuery, handleAction, applySourceFilters, refreshSources } = deps;

async function renderStatRow(def: any, targetContainer: HTMLElement) {
  const { StatRow } = await import('./StatRow.ts');
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

  bindSource(def.source, data => {
    const sourceData = data.data || {};
    const getPath = (obj: any, path: string) => path.split('.').reduce((value, key) => value == null ? undefined : value[key], obj);
    comp.stats = (def.stats || []).map((stat: any) => ({ ...stat, value: getPath(sourceData, stat.field) }));
    comp.redraw();
  });
}

async function renderGridView(def: any, targetContainer: HTMLElement) {
  const { GridView } = await import('./GridView.ts');
  const sourceId = def.source;
  const sourceResult = dataMap[sourceId] || { data: [], meta: {} };
  const treeRows = sourceResult.data || [];
  const treeById = new Map<string, any>(treeRows.map((row: any) => [String(row.id), row]));
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
          hasPermission(ctx.user, a.permission)
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
  if (def.type === 'LineItemGrid') slot.className = 'o-form-section o-form-lines-slot';
  else slot.style.marginBottom = '24px';
  targetContainer.appendChild(slot);
  comp.mount(slot);

  bindSource(sourceId, data => _origSetState({ rows: data.data || [], meta: data.meta }, true));
}

async function renderDataGrid(def: any, targetContainer: HTMLElement) {
  const GridCtor = def.type === 'LineItemGrid'
    ? (await import('./LineItemGrid.ts')).LineItemGrid
    : def.type === 'ContactGrid'
      ? (await import('./ContactGrid.ts')).ContactGrid
      : (await import('./DataGrid.ts')).DataGrid;
  const sourceId = def.source;
  const sourceResult = dataMap[sourceId] || { data: [], meta: {} };
  const footerSourceId = def.type === 'LineItemGrid' ? def.footer?.source : undefined;
  const footerRecord = footerSourceId ? (dataMap[footerSourceId]?.data || {}) : {};
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
        return hasPermission(ctx.user, permission)
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
    if (!hasPermission(ctx.user, action.permission)) return false;
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
      footerStats: def.footer?.stats || [],
      footerRecord,
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

  bindSource(sourceId, data => _origSetState({ rows: data.data || [], meta: data.meta }, true));
  bindSource(footerSourceId, data => _origSetState({ footerRecord: data.data || {} }, true));
}

async function renderListView(def: any, targetContainer: HTMLElement) {
  const { ListView } = await import('./ListView.ts');
  const sourceId = def.source;
  const sourceWorkflow = (config.datasources || []).find((source: any) => source.id === sourceId)?.workflow;
  const sourceResult = dataMap[sourceId] || { data: [], meta: {} };
  const pageSize = def.page_size || 25;
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
  const columns = (def.columns || []).map((column: any, index: number) => ({
    id: column.id || column.field || `column-${index}`,
    field: column.field,
    label: column.label || '',
    align: column.align,
    sortable: column.sortable !== false,
    optional: column.optional,
    rowActions: column.actions?.map((action: any) => ({
      ...action,
      visible: (row: any) => {
        const actionDef = (config.actions || []).find((candidate: any) => candidate.id === action.id);
        const permission = action.permission || actionDef?.permission;
        return hasPermission(ctx.user, permission)
          && (!action.show_if || Boolean(evalExpr(action.show_if, { ...ctx, row })));
      },
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
        const entity = document.createElement('div');
        entity.className = 'data-grid-entity';
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
  const views = (def.views || []).map((view: any) => ({
    id: view.id,
    label: view.label || view.id,
    icon: view.icon,
    groupBy: view.group_by,
    groups: view.groups_source
      ? (dataMap[view.groups_source]?.data || []).map((group: any) => ({ value: String(group.value), label: String(group.label || group.value), color: group.color }))
      : view.groups,
    card: view.card,
    groupsSource: view.groups_source,
  }));
  const requestedView = String(pageParams.view || '');
  const activeView = views.some((view: any) => view.id === requestedView) ? requestedView : undefined;
  const utilityActions = (def.actions || []).filter((action: any) => {
    if (!hasPermission(ctx.user, action.permission)) return false;
    return !action.show_if || Boolean(evalExpr(action.show_if, ctx));
  });
  const groupBy = (Array.isArray(def.group_by) ? def.group_by : def.group_by ? [def.group_by] : [])
    .map((group: any) => typeof group === 'string' ? { field: group, label: group } : { field: group.field, label: group.label || group.field })
    .filter((group: any) => group.field);
  const favorites = (Array.isArray(def.favorites) ? def.favorites : []).map((favorite: any) => ({
    id: String(favorite.id),
    label: String(favorite.label || favorite.id),
    filters: favorite.filters || {},
    groupBy: favorite.group_by || favorite.groupBy || '',
  }));
  const bulkActions = (def.bulk_actions || []).filter((action: any) => {
    const actionDef = (config.actions || []).find((candidate: any) => candidate.id === action.id);
    if (!hasPermission(ctx.user, action.permission || actionDef?.permission)) return false;
    return !action.show_if || Boolean(evalExpr(action.show_if, ctx));
  });
  const createDefinition = (config.actions || []).find((action: any) => action.id === def.create_action);
  const createAction = def.create_action && hasPermission(ctx.user, createDefinition?.permission)
    ? { id: def.create_action, label: def.create_label || 'New' }
    : undefined;
  const translatedLabels = def.labels || {};
  const comp = new ListView(
    `list-view-${sourceId || def.id || Date.now()}`,
    {
      rows: sourceResult.data || [],
      meta: sourceResult.meta || {},
      filters: { ...(filterState[sourceId] || {}) },
      selectedIds: [],
      ...(activeView ? { activeView } : {}),
    },
    columns,
    {
      variant: 'odoo',
      breadcrumbs: config.page?.breadcrumb || [config.title].filter(Boolean),
      createAction,
      search: def.search,
      filters,
      dateRange: def.date_range ? {
        fromField: def.date_range.from_field,
        toField: def.date_range.to_field,
        fromLabel: def.date_range.from_label,
        toLabel: def.date_range.to_label,
        label: def.date_range.label,
        presets: def.date_range.presets,
        presetLabels: def.date_range.preset_labels,
      } : undefined,
      actions: utilityActions,
      groupBy,
      favorites,
      bulkActions,
      rowKey: def.row_key || 'id',
      tree: def.tree ? { parentField: def.parent_field || 'parent_id' } : undefined,
      selectable: def.selectable === true,
      columnChooser: def.column_chooser === true,
      openAction: def.row_open_action,
      rowActions: def.row_actions || 'buttons',
      views,
      onViewChange: (view: 'list' | 'kanban') => {
        replaceParams({ ...getPageParams(), view });
      },
      emptyState: def.empty_state,
      labels: {
        new: translatedLabels.new,
        filters: translatedLabels.filters,
        columns: translatedLabels.columns,
        selected: translatedLabels.selected,
        clearSelection: translatedLabels.clear_selection,
        removeFilter: translatedLabels.remove_filter,
        previousPage: translatedLabels.previous_page,
        nextPage: translatedLabels.next_page,
        selectAll: translatedLabels.select_all,
        selectRow: (id: string) => `${translatedLabels.select_row || 'Select row'} ${id}`,
        searchFacet: translatedLabels.search_facet,
        apply: translatedLabels.apply,
        moreActions: translatedLabels.more_actions,
      },
      onFilterChange: async (values: Record<string, unknown>) => {
        const dateFields = [def.date_range?.from_field, def.date_range?.to_field].filter(Boolean);
        const targets = def.filter_sources && dateFields.some((field: string) => Object.prototype.hasOwnProperty.call(values, field))
          ? def.filter_sources
          : [sourceId];
        for (const target of targets) {
          await applySourceFilters(target, { ...(filterState[target] || {}), ...values });
        }
      },
      onPageChange: async (page: number) => {
        const nextPage = Math.max(1, page);
        const currentPageSize = paginationState[sourceId]?.top || pageSize;
        const newSkip = (nextPage - 1) * currentPageSize;
        paginationState[sourceId] = { skip: newSkip, top: currentPageSize, page: nextPage };
        try {
          const data = await refetchSource(sourceId, filterState[sourceId] || {}, newSkip, currentPageSize, sortState[sourceId]);
          updateBoundComponents(sourceId, data);
        } catch (error) {
          console.error('[page-renderer] list pagination fetch error:', error);
        }
      },
      onSort: async (sort: { field: string; direction: 'asc' | 'desc' }) => {
        sortState[sourceId] = sort;
        paginationState[sourceId] = { skip: 0, top: paginationState[sourceId]?.top || pageSize, page: 1 };
        try {
          const data = await refetchSource(sourceId, filterState[sourceId] || {}, 0, paginationState[sourceId].top, sort);
          updateBoundComponents(sourceId, data);
        } catch (error) {
          console.error('[page-renderer] list sort fetch error:', error);
        }
      },
      onKanbanMove: sourceWorkflow ? async (row: any, status: string) => {
        await client.workflow(sourceId, 'move', { id: String(row[def.row_key || 'id']), status });
        await refreshSources([sourceId]);
      } : undefined,
      onKanbanAddStatus: sourceWorkflow?.allow_add ? async (label: string) => {
        await client.workflow(sourceId, 'add_status', { label });
        const statusSource = sourceWorkflow.status_source;
        await refreshSources([sourceId, ...(statusSource ? [statusSource] : [])]);
        if (statusSource) {
          for (const view of comp.options.views || []) {
            if (view.groupsSource !== statusSource) continue;
            view.groups = (dataMap[statusSource]?.data || []).map((group: any) => ({
              value: String(group.value), label: String(group.label || group.value), color: group.color,
            }));
          }
          comp.redraw();
        }
      } : undefined,
    },
  );
  const _origSetState = comp.setState.bind(comp);
  comp._onAction = async (actionId: string, params: any) => {
    if (actionId.endsWith('.export')) {
      const { downloadXlsx, toXlsx } = await import('../xlsx-utils.ts');
      const exportColumns = (def.columns || []).filter((column: any) => column.field && column.field !== 'actions');
      const current = dataMap[sourceId] || { data: [], meta: {} };
      const total = Math.max(Number(current.meta?.total) || 0, Array.isArray(current.data) ? current.data.length : 0);
      const exportRows: any[] = [];
      try {
        for (let skip = 0; skip < total; skip += 100) {
          const result = await client.query(createQuery({
            sourceId,
            params: { ...pageParams, ...(filterState[sourceId] || {}) },
            skip,
            top: 100,
          }));
          exportRows.push(...(Array.isArray(result?.data) ? result.data : []));
          if (!result?.data?.length) break;
        }
      } catch (error) {
        console.error(`[page-renderer] Export fetch failed for "${sourceId}"`, error);
      }
      downloadXlsx(`${config.page?.id || sourceId}-export`, toXlsx(exportRows.length ? exportRows : (current.data || []), exportColumns));
      return;
    }
    const actionDef = (config.actions || []).find((action: any) => action.id === actionId);
    if (actionDef) await handleAction(actionDef, params?.row || params || {});
  };
  const slot = document.createElement('div');
  slot.className = 'o-list-view-slot';
  targetContainer.appendChild(slot);
  comp.mount(slot);
  bindSource(sourceId, data => _origSetState({ rows: data.data || [], meta: data.meta }, true));
}

async function renderScheduleGrid(def: any, targetContainer: HTMLElement) {
  const { ScheduleGrid } = await import('./ScheduleGrid.ts');
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
  bindSource(def.source, data => component.setState({ rows: data.data || [], meta: data.meta }, true));
}


  return { renderStatRow, renderGridView, renderDataGrid, renderListView, renderScheduleGrid };
}

}


