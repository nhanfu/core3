import { evalExpr } from '@core3/client/expr';
import { hasPermission } from '@core3/client/meta';
import { navigate, getPageParams, pushParams } from '@core3/client/navigate';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { PageDetailRenderers } from './PageDetailRenderers.ts';
import { PageFormModal } from './PageFormModal.ts';
import { html } from '@core3/client/html';
import { i18n } from '@core3/client/i18n';
import { ComLoader } from '@core3/client/components/ComLoader';

function pivotRequestFromUrl(params: Record<string, string>, view: any) {
  const defaults = view?.pivot?.default || {};
  const hasRows = Object.prototype.hasOwnProperty.call(params, 'pivot_rows');
  const hasColumns = Object.prototype.hasOwnProperty.call(params, 'pivot_columns');
  const rows = String(hasRows ? params.pivot_rows : (defaults.rows || []).join(',')).split(',').map(value => value.trim()).filter(Boolean);
  const columns = String(hasColumns ? params.pivot_columns : (defaults.columns || []).join(',')).split(',').map(value => value.trim()).filter(Boolean);
  const ranges: Record<string, string> = { ...(view?.pivot?.date_ranges || {}) };
  if (params.pivot_ranges) for (const spec of String(params.pivot_ranges).split(',').map(value => value.trim()).filter(Boolean)) {
    const [field, range] = spec.split(':').map(value => value.trim());
    if (field && ['day', 'week', 'month', 'quarter', 'year'].includes(range)) ranges[field] = range;
  }
  const defaultMeasures = Array.isArray(defaults.measures) ? defaults.measures : [];
  const measureSpecs = params.pivot_measures
    ? String(params.pivot_measures).split(',').map(value => value.trim()).filter(Boolean)
    : defaultMeasures.map((measure: any) => measure.aggregate === 'count'
      ? `count:${measure.column || measure.label || 'Count'}`
      : `${measure.field}:${measure.aggregate || 'sum'}:${measure.column || measure.label || measure.field}`);
  const measures = measureSpecs.map((spec: string) => {
    const [field, aggregate = 'sum', label] = spec.split(':').map((value: string) => value.trim());
    if (field === 'count' && aggregate !== 'sum') return { aggregate: 'count', label: label || aggregate || 'Count' };
    if (field === 'count') return { aggregate: 'count', label: label || 'Count' };
    return { field, aggregate, label: label || field };
  });
  return measures.length ? { rows, columns, measures, ranges } : undefined;
}

export class PageGridRenderers extends BaseComponent {
  readonly renderers: any;

  constructor(deps: any) {
    super('page-grid-renderers');
    this.renderers = this.createRenderers(deps);
  }

  private createRenderers(deps: any) {
  const { config, dataMap, ctx, bindSource, sortState, paginationState, filterState, pageParams, refetchSource, updateBoundComponents, client, createQuery, handleAction, applySourceFilters, refreshSources, handleInlineForm, resolveActionParams, registry } = deps;
const owner = this;
const componentLoader = new ComLoader();

function mountOwned<T extends BaseComponent>(component: T, container: HTMLElement): T {
  return owner.mountChild(component, container);
}

async function renderStatRow(def: any, targetContainer: HTMLElement) {
  const { StatRow } = await import('@core3/client/components/StatRow');
  const sourceData = def.source ? ((dataMap[def.source] || {}).data || {}) : {};
  const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  const mappedStats = (def.stats || []).map(s => ({ ...s, value: getPath(sourceData, s.field) }));

  const comp = new StatRow(
    `stat-row-${def.source || Date.now()}`,
    mappedStats,
    def.title || '',
    path => void navigate(path),
  );
  const slot = html.take(targetContainer).div.className(def.variant === 'contained' ? 'status-tabs-slot-contained' : '').css('marginBottom', def.variant === 'contained' ? '0' : '16px').ele() as HTMLElement;
  mountOwned(comp, slot);

  bindSource(def.source, data => {
    const sourceData = data.data || {};
    const getPath = (obj: any, path: string) => path.split('.').reduce((value, key) => value == null ? undefined : value[key], obj);
    comp.stats = (def.stats || []).map((stat: any) => ({ ...stat, value: getPath(sourceData, stat.field) }));
    comp.redraw();
  });
}

async function renderGridView(def: any, targetContainer: HTMLElement) {
  const { GridView } = await import('@core3/client/components/GridView');
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
    return componentLoader.stateSync(colDef.type || 'TextCell', colDef, {
      row,
      actionFilter: (action: any) => hasPermission(ctx.user, action.permission)
        && (!action.show_if || evalExpr(action.show_if, { ...ctx, row })),
    });
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
      await handleAction(actionDef, {
        ...row,
        ...(Array.isArray(params?.selectedIds) ? { selectedIds: params.selectedIds } : {}),
      });
    } else {
      console.error(`[page-renderer] No action def found for: ${actionId}`);
    }
  };

  const slot = html.take(targetContainer).div.ele() as HTMLElement;
  if (def.type === 'LineItemGrid') html.take(slot).className('o-form-section o-form-lines-slot');
  else html.take(slot).css('marginBottom', '24px');
  mountOwned(comp, slot);

  bindSource(sourceId, data => _origSetState({ rows: data.data || [], meta: data.meta }, true));
}

async function renderDataGrid(def: any, targetContainer: HTMLElement) {
  const GridCtor = def.type === 'LineItemGrid'
    ? (await import('@core3/client/components/LineItemGrid')).LineItemGrid
    : def.type === 'ContactGrid'
      ? (await import('@core3/client/components/ContactGrid')).ContactGrid
      : (await import('@core3/client/components/DataGrid')).DataGrid;
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
        html.take(cell).css('paddingLeft', `${16 + depth * 20}px`);
        cell.dataset.treeDepth = String(depth);
      }
      if (column.type === 'StatusChip') {
        const tone = column.colors?.[String(value)] || column.tone || 'neutral';
        html.take(cell).span.className(`data-grid-status data-grid-status-${tone}`).replaceText(value == null || value === '' ? '—' : String(value));
        return;
      }
      if (column.type === 'PrimaryEntityCell') {
        const entity = html.take(cell).div.className('data-grid-entity').ele() as HTMLElement;
        if (column.avatar) {
          html.take(entity).span.className('data-grid-entity-avatar').innerHTML('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V6l8-3 8 3v14"/><path d="M8 20v-5h8v5M8 9h.01M12 9h.01M16 9h.01"/></svg>');
        }
        const copy = html.take(entity).span.className('data-grid-entity-copy').ele() as HTMLElement;
        html.take(copy).div.className('data-grid-primary').replaceText(value == null || value === '' ? '—' : String(value));
        if (column.secondary) {
          html.take(copy).div.className('data-grid-secondary').replaceText(row[column.secondary] == null ? '' : String(row[column.secondary]));
        }
        return;
      }
      if (column.type === 'WeightCell') {
        html.take(cell).replaceText(value == null || value === '' ? '—' : `${Number(value).toLocaleString()} ${column.unit || 'kg'}`);
        return;
      }
      if (column.type === 'DateCell') {
        if (value == null || value === '') {
          html.take(cell).replaceText('—');
          return;
        }
        const date = new Date(String(value));
        html.take(cell).replaceText(Number.isNaN(date.valueOf())
          ? String(value)
          : new Intl.DateTimeFormat(column.locale || 'vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            ...(String(value).includes('T') ? { hour: '2-digit', minute: '2-digit' } : {}),
          }).format(date));
        return;
      }
      html.take(cell).replaceText(value == null || value === '' ? '—' : String(value));
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
      variant: def.variant,
    },
    columns,
    {
      rowKey: def.row_key || 'id',
      selectable: !!def.selectable,
      columnChooser: def.column_chooser === true,
      rowNumbers: def.row_numbers === true,
      labels: {
        ...(config.locale === 'vi' ? {
        rowNumber: 'Số dòng',
        selectRow: (id: string) => `Chọn dòng ${id}`,
        expandRow: 'Mở rộng dòng',
        collapseRow: 'Thu gọn dòng',
        summaryOf: 'trên',
        previousPage: 'Trang trước',
        nextPage: 'Trang sau',
        } : {}),
        ...(def.labels || {}),
      },
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

  if (def.type === 'LineItemGrid' && typeof comp.configureInline === 'function') {
    const fieldChildren = (def.children || []).filter((child: any) => child.type === 'LineItemField');
    const actionChild = (def.children || []).find((child: any) => child.type === 'LineItemActions');
    const inlineFields = fieldChildren.length
      ? fieldChildren.map((field: any) => ({
        ...field,
        options: field.options_source
          ? (Array.isArray(dataMap[field.options_source]?.data) ? dataMap[field.options_source].data : [])
            .map((option: any) => ({ value: String(option.value ?? option.id ?? ''), label: String(option.label ?? option.name ?? option.value ?? '') }))
          : field.options,
      }))
      : (def.columns || []).filter((column: any) => column.field && column.field !== 'actions')
        .map((column: any) => ({ type: 'LineItemField', field: column.field, label: column.label, readonly: column.field.endsWith('_display') }));
    const inlineActions = actionChild?.actions || (def.columns || []).flatMap((column: any) => column.actions || []);
    const editAction = actionChild?.edit_action || inlineActions.find((action: any) => action.id.startsWith('edit_'))?.id;
    const createAction = actionChild?.create_action || (def.actions || [])[0]?.id;
    comp.configureInline({
      fields: inlineFields,
      actions: inlineActions,
      editAction,
      createAction,
      visible: (action: any, row: any) => hasPermission(ctx.user, action.permission)
        && (!action.show_if || Boolean(evalExpr(action.show_if, { ...ctx, row }))),
      onSave: async (actionId: string, row: any, values: any) => {
        const actionDef = (config.actions || []).find((candidate: any) => candidate.id === actionId);
        if (!actionDef) return;
        const parentSourceId = def.parent_source || def.footer?.source;
        let parentExpectedRowVersion = parentSourceId ? dataMap[parentSourceId]?.data?.row_version : undefined;
        if (parentSourceId) {
          const freshParent = await client.query(createQuery({
            sourceId: parentSourceId,
            params: pageParams,
            skip: 0,
            top: 1,
          }));
          dataMap[parentSourceId] = freshParent;
          parentExpectedRowVersion = freshParent?.data?.row_version;
        }
        await handleInlineForm(actionDef, {
          ...values,
          id: row.id === '__new__' ? undefined : row.id,
          row_version: row.row_version,
          parent_expected_row_version: parentExpectedRowVersion,
        });
        comp.setState({ editingId: null });
      },
    });
  }

  const _origSetState = comp.setState.bind(comp);
  comp._onAction = async (actionId: string, params: any) => {
    const actionDef = (config.actions || []).find(action => action.id === actionId);
    if (actionDef) await handleAction(actionDef, params?.row || params || {});
  };

  const slot = html.take(targetContainer).div.css('marginBottom', '24px').ele() as HTMLElement;
  mountOwned(comp, slot);

  bindSource(sourceId, data => _origSetState({ rows: data.data || [], meta: data.meta }, true));
  bindSource(footerSourceId, data => _origSetState({ footerRecord: data.data || {} }, true));
}

async function renderListView(def: any, targetContainer: HTMLElement) {
  const { ListView } = await import('@core3/client/components/ListView');
  const sourceId = def.source;
  const sourceWorkflow = (config.datasources || []).find((source: any) => source.id === sourceId)?.workflow;
  const sourceDefinition = (config.datasources || []).find((source: any) => source.id === sourceId);
  const sourceResult = dataMap[sourceId] || { data: [], meta: {} };
  const pivotConfig = (def.views || []).find((view: any) => view.id === 'pivot')?.pivot || {};
  const pivotFieldMappings = Array.isArray(pivotConfig.fields) ? pivotConfig.fields : [];
  const pivotFields = pivotFieldMappings.length
    ? pivotFieldMappings.map((field: any) => String(field.field))
    : Array.isArray(sourceDefinition?.pivot?.fields)
      ? sourceDefinition.pivot.fields.map(String)
    : Object.keys((Array.isArray(sourceResult.data) ? sourceResult.data[0] : {}) || {});
  const pivotFieldLabels = Object.fromEntries(pivotFieldMappings.map((field: any) => [String(field.field), String(field.column || field.field)]));
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
        const tone = column.colors?.[String(value)] || column.tone || 'neutral';
        html.take(cell).span.className(`data-grid-status data-grid-status-${tone}`).replaceText(value == null || value === '' ? '—' : String(value));
        return;
      }
      if (column.type === 'PrimaryEntityCell') {
        const entity = html.take(cell).div.className('data-grid-entity').ele() as HTMLElement;
        const copy = html.take(entity).span.className('data-grid-entity-copy').ele() as HTMLElement;
        html.take(copy).div.className('data-grid-primary').replaceText(value == null || value === '' ? '—' : String(value));
        if (column.secondary) {
          html.take(copy).div.className('data-grid-secondary').replaceText(row[column.secondary] == null ? '' : String(row[column.secondary]));
        }
        return;
      }
      if (column.type === 'DateCell') {
        if (value == null || value === '') {
          html.take(cell).replaceText('—');
          return;
        }
        const date = new Date(String(value));
        html.take(cell).replaceText(Number.isNaN(date.valueOf())
          ? String(value)
          : new Intl.DateTimeFormat(column.locale || 'vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            ...(String(value).includes('T') ? { hour: '2-digit', minute: '2-digit' } : {}),
          }).format(date));
        return;
      }
      html.take(cell).replaceText(value == null || value === '' ? '—' : String(value));
    } : undefined,
  }));
  const views = (def.views || []).map((view: any) => ({
    id: view.id,
    label: view.label || view.id,
    icon: view.icon,
    dateField: view.date_field,
    endDateField: view.end_date_field,
    rowField: view.row_field,
    columnField: view.column_field,
    measureField: view.measure_field,
    measureLabel: view.measure_label,
    categoryField: view.category_field,
    type: view.type,
    labelField: view.label_field,
    subtitleField: view.subtitle_field,
    latitudeField: view.latitude_field,
    longitudeField: view.longitude_field,
    pivot: view.pivot,
    fields: view.id === 'pivot' ? pivotFields : undefined,
    fieldLabels: view.id === 'pivot' ? pivotFieldLabels : undefined,
    dateFields: view.id === 'pivot' ? pivotFieldMappings.filter((field: any) => field.type === 'date' || view.pivot?.date_ranges?.[field.field]).map((field: any) => String(field.field)) : undefined,
    dateRanges: view.id === 'pivot' ? view.pivot?.date_ranges || {} : undefined,
    configLabel: view.pivot?.config_label,
    rowFields: view.row_fields || (view.row_field ? [view.row_field] : view.pivot?.default?.rows || []),
    columnFields: view.column_fields || (view.column_field ? [view.column_field] : view.pivot?.default?.columns || []),
    measures: view.measures || view.pivot?.default?.measures?.map((measure: any) => ({ field: measure.field, aggregate: measure.aggregate || 'sum', label: measure.column || measure.label })) || [],
    groupBy: view.group_by,
    groups: view.groups_source
      ? (dataMap[view.groups_source]?.data || []).map((group: any) => ({ value: String(group.value), label: String(group.label || group.value), color: group.color }))
      : view.groups,
    card: view.card,
    groupsSource: view.groups_source,
    form: view.form,
  }));
  const requestedView = String(pageParams.view || '');
  // Keep an explicitly selected view stable across viewport sizes. CardView
  // and ListView are separate view modes, not responsive aliases.
  const activeView = views.some((view: any) => view.id === requestedView) ? requestedView : undefined;
  const pivotView = activeView === 'pivot' ? views.find((view: any) => view.id === 'pivot') : undefined;
  const pivotQuery = pivotView ? pivotRequestFromUrl(pageParams, pivotView) : undefined;
  if (pivotView && pivotQuery) Object.assign(pivotView, {
    rowFields: pivotQuery.rows,
    columnFields: pivotQuery.columns,
    measures: pivotQuery.measures,
    dateRanges: pivotQuery.ranges,
  });
  let activeSourceResult = sourceResult;
  if (pivotQuery) {
    try {
      activeSourceResult = await client.query(createQuery({ sourceId, params: pageParams, skip: 0, top: pageSize, pivot: pivotQuery }));
      dataMap[sourceId] = activeSourceResult;
    } catch (error) {
      console.error(`[page-renderer] pivot query failed for "${sourceId}":`, error);
    }
  }
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
  const formView = def.form_view?.page ? {
    page: def.form_view.page,
    sidePanel: def.form_view.side_panel !== false,
  } : undefined;
  const renderForm = formView ? async (row: any, target: HTMLElement) => {
    const newRecord = row?.__new_record === true;
    html.take(target).innerHTML('<div class="o-list-form-loading">Loading form...</div>');
    const pageId = String(formView.page).split('/').pop()!.replace(/\.ya?ml$/, '');
    try {
      const detailConfig = await client._fetch(
        `${client._resolveBase()}/pages/${encodeURIComponent(pageId)}?id=${encodeURIComponent(String(row.id))}&lc=${encodeURIComponent(i18n.lang)}`,
        { method: 'GET' },
      );
      if (detailConfig.i18n) i18n.hydrate(pageId, detailConfig.i18n);
      const translatedDetailConfig = i18n.translatePageConfig(pageId, detailConfig);
      Object.assign(detailConfig, translatedDetailConfig);
      if (newRecord && createDefinition) {
        const inlineCreateId = `inline_create_${sourceId}`;
        detailConfig.actions = [
          ...(detailConfig.actions || []),
          { ...createDefinition, id: inlineCreateId, refresh: [...(createDefinition.refresh || []), sourceId] },
        ];
        detailConfig.components = (detailConfig.components || []).map((component: any) => component.type === 'OdooFormView'
          ? {
            ...component,
            initial_editing: true,
            editable: true,
            header_actions: [{ id: inlineCreateId, label: 'Create', variant: 'primary' }, ...(component.header_actions || [])],
          }
          : component);
      }
      const detailData = Object.fromEntries((detailConfig.datasources || []).map((source: any) => [source.id, source]));
      const detailParams = { ...pageParams, id: String(row.id) };
      const detailCtx = { ...ctx, row, state: { ...ctx.state, ...detailParams } };
      for (const [sourceId, sourceResult] of Object.entries(detailData) as Array<[string, any]>) {
        if (sourceResult?.data && !Array.isArray(sourceResult.data)) {
          detailCtx.state = { ...detailCtx.state, [sourceId]: sourceResult.data };
        }
      }
      const detailBindings: Record<string, Array<(data: any) => void>> = {};
      const detailBindSource = (sourceId: string | undefined, update: (data: any) => void) => {
        if (!sourceId) return;
        (detailBindings[sourceId] ||= []).push(update);
      };
      const detailRefreshSources = async (sourceIds: string[] = []) => {
        for (const sourceId of sourceIds) {
          const source = (detailConfig.datasources || []).find((candidate: any) => candidate.id === sourceId);
          if (!source) continue;
          const result = await client.query(createQuery({ sourceId, params: detailParams, skip: 0, top: source.page_size || 100 }));
          detailData[sourceId] = result;
          if (result?.data && !Array.isArray(result.data)) {
            detailCtx.state = { ...detailCtx.state, [sourceId]: result.data };
          }
          for (const update of detailBindings[sourceId] || []) update(result);
        }
      };
      const detailHandleAction = async (actionDef: any, actionRow: any) => {
        if (!actionDef) return;
        if (actionDef.type === 'form' || actionDef.type === 'server_form') {
          await detailFormModal.openFormModal({ ...actionDef, refresh: [] }, actionRow);
          await detailRefreshSources(actionDef.refresh || []);
          return;
        }
        await handleAction({ ...actionDef, refresh: [] }, actionRow, detailCtx);
        await detailRefreshSources(actionDef.refresh || []);
      };
      const detailHandleInlineForm = async (actionDef: any, values: Record<string, unknown>) => {
        await handleInlineForm({ ...actionDef, refresh: [] }, {
          ...values,
          parent_expected_row_version: detailData.order_detail?.data?.row_version,
        });
        await detailRefreshSources(actionDef.refresh || []);
        if (newRecord) {
          await refreshSources([sourceId]);
          comp.setState({ formPanelClosed: true });
        }
      };
      const detailFormModal = new PageFormModal({
        dataMap: detailData,
        ctx: detailCtx,
        client,
        refreshSources: detailRefreshSources,
        resolveActionParams,
      });
      const detailGridRenderer = new PageGridRenderers({
        ...deps,
        config: detailConfig,
        dataMap: detailData,
        ctx: detailCtx,
        bindSource: detailBindSource,
        pageParams: detailParams,
        filterState: {},
        paginationState: {},
        sortState: {},
        refreshSources: detailRefreshSources,
        handleAction: detailHandleAction,
        applySourceFilters: async () => undefined,
        updateBoundComponents: (sourceId: string, result: any) => {
          for (const update of detailBindings[sourceId] || []) update(result);
        },
      });
      const detailRenderer = new PageDetailRenderers({
        ...deps,
        config: detailConfig,
        dataMap: detailData,
        ctx: detailCtx,
        bindSource: detailBindSource,
        pageParams: detailParams,
        filterState: {},
        paginationState: {},
        sortState: {},
        refreshSources: detailRefreshSources,
        handleAction: detailHandleAction,
        handleInlineForm: detailHandleInlineForm,
        resolveActionParams,
        registry,
        ...detailGridRenderer.renderers,
      });
      owner.adoptChild(detailFormModal);
      owner.adoptChild(detailGridRenderer);
      owner.adoptChild(detailRenderer);
      html.take(target).clear();
      let previousPanelContent: HTMLElement | undefined;
      for (const [index, componentDef] of (detailConfig.components || []).entries()) {
        const destination = componentDef.mount_in === 'previous-panel' && previousPanelContent ? previousPanelContent : target;
        const rendered = await detailRenderer.renderers.renderComponentDef(componentDef, destination);
        previousPanelContent = rendered instanceof HTMLElement ? rendered : undefined;
        if (!previousPanelContent && index === 0) previousPanelContent = undefined;
      }
    } catch (error) {
      html.take(target).innerHTML(`<div class="o-list-form-error">${error instanceof Error ? error.message : 'Failed to load form'}</div>`);
    }
  } : undefined;
  const createDefinition = (config.actions || []).find((action: any) => action.id === def.create_action);
  const createAction = def.create_action && hasPermission(ctx.user, createDefinition?.permission)
    ? { id: def.create_action, label: def.create_label || 'New' }
    : undefined;
  const translatedLabels = def.labels || {};
  const initialFormMode = pageParams.form === 'hidden' ? 'hidden' : 'right';
  const initialFormRowId = pageParams.form_id ? String(pageParams.form_id) : undefined;
  const comp = new ListView(
    `list-view-${sourceId || def.id || Date.now()}`,
    {
      rows: activeSourceResult.data || [],
      meta: activeSourceResult.meta || {},
      filters: { ...(filterState[sourceId] || {}) },
      selectedIds: [],
      ...(sortState[sourceId] ? { sort: sortState[sourceId] } : {}),
      ...(activeView ? { activeView } : {}),
      formPanelMode: initialFormMode,
      ...(initialFormRowId ? { formRowId: initialFormRowId } : {}),
    },
    columns,
    {
      variant: 'odoo',
      scroll: def.scroll === 'body' ? 'body' : 'list',
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
        maxYears: def.date_range.max_years,
        denyUnbounded: def.date_range.deny_unbounded,
        applyLabel: def.date_range.apply_label,
        calendarPreviousLabel: def.date_range.calendar_previous_label,
        calendarNextLabel: def.date_range.calendar_next_label,
        weekdayLabels: def.date_range.weekday_labels,
        validationMessages: def.date_range.validation_messages,
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
      doubleClickAction: def.row_double_click_action,
      formView,
      renderForm,
      columnStorageKey: `core3:columns:${String(config.page?.id || config.title || 'page')}:${sourceId}`,
      onFormStateChange: ({ mode, rowId }: { mode: 'right' | 'hidden'; rowId?: string }) => {
        const nextParams = { ...getPageParams() } as Record<string, unknown>;
        nextParams.form = mode === 'hidden' ? 'hidden' : 'show';
        if (rowId && rowId !== '__new__') nextParams.form_id = rowId;
        else delete nextParams.form_id;
        pushParams(nextParams);
      },
      rowActions: def.row_actions || 'buttons',
      views,
      viewNavigation: def.view_navigation || 'icons',
      responsiveCard: def.responsive_card === true,
      onViewChange: (view: string) => {
        const params = { ...getPageParams(), view } as Record<string, string | undefined>;
        if (view !== 'pivot') {
          delete params.pivot_rows;
          delete params.pivot_columns;
          delete params.pivot_measures;
          delete params.pivot_ranges;
          const pageState = paginationState[sourceId] || { page: 1, top: pageSize };
          params.page = String(pageState.page || 1);
          params.page_size = String(pageState.top || pageSize);
          if (sortState[sourceId]) {
            params.sort = sortState[sourceId].field;
            params.sort_dir = sortState[sourceId].direction;
          }
        } else {
          delete params.page;
          delete params.page_size;
          delete params.sort;
          delete params.sort_dir;
        }
        // Keep the previous Pivot URL in browser history. This lets Back
        // restore its rows, columns, and measures after visiting another view.
        pushParams(params);
        const selectedView = views.find((candidate: any) => candidate.id === view);
        const nextPivot = selectedView?.id === 'pivot'
          ? { rows: selectedView.rowFields, columns: selectedView.columnFields, measures: selectedView.measures, ranges: selectedView.dateRanges || {} }
          : undefined;
        void refetchSource(sourceId, filterState[sourceId] || {}, 0, paginationState[sourceId]?.top || pageSize, sortState[sourceId], nextPivot)
          .then((data: any) => comp.setState({ rows: data.data || [], meta: data.meta || {} }));
      },
      onPivotChange: (request: { rows: string[]; columns: string[]; measures: Array<{ field?: string; aggregate: string; label?: string }>; ranges?: Record<string, string> }) => {
        const params = {
          ...getPageParams(),
          view: 'pivot',
          pivot_rows: request.rows.join(','),
          pivot_columns: request.columns.join(','),
          pivot_measures: request.measures.map(measure => measure.aggregate === 'count'
            ? `count:${measure.label || 'Count'}`
            : `${measure.field}:${measure.aggregate}:${measure.label || measure.field}`).join(','),
          pivot_ranges: Object.entries(request.ranges || {}).map(([field, range]) => `${field}:${range}`).join(','),
        };
        pushParams(params);
        void refetchSource(sourceId, filterState[sourceId] || {}, 0, paginationState[sourceId]?.top || pageSize, sortState[sourceId], request)
          .then((data: any) => comp.setState({ rows: data.data || [], meta: data.meta || {}, pivotError: undefined }))
          .catch((error: unknown) => comp.setState({ pivotError: error instanceof Error ? error.message : String(error) }));
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
        const nextParams = { ...getPageParams() } as Record<string, unknown>;
        for (const [key, value] of Object.entries(values)) {
          if (value == null || value === '') delete nextParams[key];
          else nextParams[key] = value;
        }
        nextParams.page = '1';
        pushParams(nextParams);
        for (const target of targets) {
          await applySourceFilters(target, { ...(filterState[target] || {}), ...values }, pivotQuery, false);
        }
      },
      onPageChange: async (page: number) => {
        const nextPage = Math.max(1, page);
        const currentPageSize = paginationState[sourceId]?.top || pageSize;
        const newSkip = (nextPage - 1) * currentPageSize;
        paginationState[sourceId] = { skip: newSkip, top: currentPageSize, page: nextPage };
        pushParams({ ...getPageParams(), page: String(nextPage), page_size: String(currentPageSize) });
        try {
          const data = await refetchSource(sourceId, filterState[sourceId] || {}, newSkip, currentPageSize, sortState[sourceId], pivotQuery);
          updateBoundComponents(sourceId, data);
        } catch (error) {
          console.error('[page-renderer] list pagination fetch error:', error);
        }
      },
      onSort: async (sort: { field: string; direction: 'asc' | 'desc' }) => {
        sortState[sourceId] = sort;
        paginationState[sourceId] = { skip: 0, top: paginationState[sourceId]?.top || pageSize, page: 1 };
        pushParams({ ...getPageParams(), page: '1', page_size: String(paginationState[sourceId].top), sort: sort.field, sort_dir: sort.direction });
        try {
          const data = await refetchSource(sourceId, filterState[sourceId] || {}, 0, paginationState[sourceId].top, sort, pivotQuery);
          updateBoundComponents(sourceId, data);
        } catch (error) {
          console.error('[page-renderer] list sort fetch error:', error);
        }
      },
      onKanbanMove: sourceWorkflow ? async (row: any, status: string) => {
        await client.workflow(sourceId, 'move', { id: String(row[def.row_key || 'id']), status, expected_row_version: row.row_version });
        await refreshSources([sourceId]);
      } : undefined,
      onKanbanAddStatus: sourceWorkflow?.allow_add ? async (label: string, fromStates: string[], toStates: string[]) => {
        await client.workflow(sourceId, 'add_status', { label, from: fromStates, to: toStates });
        const statusSource = sourceWorkflow.status_source;
        await refreshSources([sourceId, ...(statusSource ? [statusSource] : [])]);
        if (statusSource) {
          for (const view of comp.options.views || []) {
            const viewConfig = view as any;
            if (viewConfig.groupsSource !== statusSource) continue;
            viewConfig.groups = (dataMap[statusSource]?.data || []).map((group: any) => ({
              value: String(group.value), label: String(group.label || group.value), color: group.color,
            }));
          }
          comp.redraw();
        }
      } : undefined,
      onKanbanEditStatus: sourceWorkflow?.allow_add && sourceWorkflow.state_editor?.allow_edit !== false ? async (stateId: string, label: string, fromStates: string[], toStates: string[]) => {
        await client.workflow(sourceId, 'edit_status', { id: stateId, label, from: fromStates, to: toStates });
        sourceWorkflow.transitions = (sourceWorkflow.transitions || [])
          .filter((transition: any) => {
            const from = Array.isArray(transition.from) ? transition.from : [transition.from];
            return transition.to !== stateId && !from.includes(stateId);
          })
          .concat([
            ...fromStates.map(from => ({ id: `move_${from}_to_${stateId}`, from, to: stateId, permission: sourceWorkflow.permission })),
            ...toStates.map(to => ({ id: `move_${stateId}_to_${to}`, from: stateId, to, permission: sourceWorkflow.permission })),
          ]);
        const statusSource = sourceWorkflow.status_source;
        await refreshSources([sourceId, ...(statusSource ? [statusSource] : [])]);
        if (statusSource) {
          for (const view of comp.options.views || []) {
            const viewConfig = view as any;
            if (viewConfig.groupsSource !== statusSource) continue;
            viewConfig.groups = (dataMap[statusSource]?.data || []).map((group: any) => ({
              value: String(group.value), label: String(group.label || group.value), color: group.color,
            }));
          }
          comp.redraw();
        }
      } : undefined,
      onKanbanDeleteStatus: sourceWorkflow?.state_editor?.allow_delete ? async (stateId: string, replacementState: string) => {
        await client.workflow(sourceId, 'delete_status', { id: stateId, replacement: replacementState });
        sourceWorkflow.states = (sourceWorkflow.states || []).filter((state: any) => String(state.id) !== stateId);
        sourceWorkflow.transitions = (sourceWorkflow.transitions || []).filter((transition: any) => {
          const from = Array.isArray(transition.from) ? transition.from : [transition.from];
          return transition.to !== stateId && !from.includes(stateId);
        });
        const statusSource = sourceWorkflow.status_source;
        await refreshSources([sourceId, ...(statusSource ? [statusSource] : [])]);
        if (statusSource) {
          for (const view of comp.options.views || []) {
            const viewConfig = view as any;
            if (viewConfig.groupsSource !== statusSource) continue;
            viewConfig.groups = (dataMap[statusSource]?.data || []).map((group: any) => ({
              value: String(group.value), label: String(group.label || group.value), color: group.color,
            }));
          }
          comp.redraw();
        }
      } : undefined,
      kanbanTransitions: sourceWorkflow?.transitions,
      kanbanStateEditor: sourceWorkflow?.state_editor,
    },
  );
  const _origSetState = comp.setState.bind(comp);
  comp._onAction = async (actionId: string, params: any) => {
    if (actionId.endsWith('.export')) {
      const { downloadXlsx, toXlsx } = await import('@core3/client/xlsx-utils');
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
  const slot = html.take(targetContainer).div.className('o-list-view-slot').ele() as HTMLElement;
  mountOwned(comp, slot);
  bindSource(sourceId, data => _origSetState({ rows: data.data || [], meta: data.meta }, true));
}

async function renderScheduleGrid(def: any, targetContainer: HTMLElement) {
  const { ScheduleGrid } = await import('@core3/client/components/ScheduleGrid');
  const sourceResult = dataMap[def.source] || { data: [] };
  const component = new ScheduleGrid(
    `schedule-grid-${def.source || def.id || Date.now()}`,
    { rows: Array.isArray(sourceResult.data) ? sourceResult.data : [] },
    def,
  );
  const slot = html.take(targetContainer).div.css('marginBottom', '24px').ele() as HTMLElement;
  mountOwned(component, slot);
  bindSource(def.source, data => component.setState({ rows: data.data || [], meta: data.meta }, true));
}


  return { renderStatRow, renderGridView, renderDataGrid, renderListView, renderScheduleGrid };
}

}
