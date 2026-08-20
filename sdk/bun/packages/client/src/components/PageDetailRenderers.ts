import { evalExpr } from '@core3/client/expr';
import { hasPermission } from '@core3/client/meta';
import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';
import { AvatarPicker } from '@core3/client/components/AvatarPicker';

export class PageDetailRenderers extends BaseComponent {
  readonly renderers: any;

  constructor(deps: any) {
    super('page-detail-renderers');
    this.renderers = this.createRenderers(deps);
  }

  private createRenderers(deps: any) {
  const { config, dataMap, ctx, bindSource, filterState, pageParams, client, createQuery, refreshSources, refetchSource, applySourceFilters, handleAction, handleInlineForm, resolveActionParams, registry, renderStatRow, renderGridView, renderDataGrid, renderListView, renderScheduleGrid, refreshStatusTabCounts } = deps;

async function renderDocumentSummary(def: any, targetContainer: HTMLElement) {
  const { DocumentSummary } = await import('@core3/client/components/DocumentSummary');
  const sourceResult = dataMap[def.source] || { data: {} };
  const comp = new DocumentSummary(
    `document-summary-${def.source || def.id || Date.now()}`,
    { record: sourceResult.data || {} },
    def,
  );
  const slot = html.take(targetContainer).div.css('marginBottom', '24px').ele() as HTMLElement;
  comp.mount(slot);
  bindSource(def.source, data => comp.setState({ record: data.data || {} }, true));
}

async function renderOdooFormView(def: any, targetContainer: HTMLElement) {
  const { OdooFormView } = await import('@core3/client/components/OdooFormView');
  const sourceResult = dataMap[def.source] || { data: {} };
  const formDef = { ...def };
  formDef.locale = config.locale;
  formDef.permission_options = Array.isArray(dataMap.role_permissions?.data) ? dataMap.role_permissions.data : [];
  if (def.statusbar_source) {
    const statusSource = dataMap[def.statusbar_source]?.data || [];
    formDef.statusbar = statusSource.map((state: any) => ({ value: state.value, label: state.label }));
    formDef.status_colors = {
      ...(formDef.status_colors || {}),
      ...Object.fromEntries(statusSource.map((state: any) => [state.value, state.color || 'neutral'])),
    };
  }
  const editButton = (def.header_actions || []).find((button: any) => {
    const action = (config.actions || []).find((candidate: any) => candidate.id === button.id);
    return action && ['form', 'server_form'].includes(action.type)
      && (action.operation === 'update' || (def.initial_editing === true && action.operation === 'insert'));
  });
  const editAction = editButton ? (config.actions || []).find((candidate: any) => candidate.id === editButton.id) : undefined;
  if (editAction) {
    formDef.editable = def.editable !== false;
    formDef.edit_action_id = editAction.id;
    formDef.edit_fields = (editAction.fields || []).map((field: any) => ({
      ...field,
      options: field.options || (field.options_source
        ? (dataMap[field.options_source]?.data || []).map((row: any) => ({ value: row.value ?? row.id ?? row.code, label: row.label ?? row.name ?? row.value ?? row.id ?? row.code }))
        : undefined),
    }));
  }
  for (const key of ['message_action', 'note_action', 'follower_add_action', 'follower_remove_action', 'attachment_upload_action', 'attachment_download_action']) {
    const action = (config.actions || []).find((candidate: any) => candidate.id === def[key]);
    if (!action || !hasPermission(ctx.user, action.permission)) delete formDef[key];
  }
  const attachmentDownloadAction = (config.actions || []).find((candidate: any) => candidate.id === formDef.attachment_download_action);
  if (attachmentDownloadAction) {
    formDef.resolve_attachment_blob = (row: any) => {
      const id = encodeURIComponent(String(row?.id || ''));
      const path = attachmentDownloadAction.kind === 'employee_document'
        ? `/hr/employee-documents/${id}`
        : attachmentDownloadAction.kind === 'contract_document'
          ? `/hr/contract-documents/${id}`
          : attachmentDownloadAction.kind === 'company_document'
            ? `/org/company-documents/${id}`
            : attachmentDownloadAction.kind === 'order_attachment'
              ? `/orders/attachments/${id}`
              : `/chat/attachments/${id}`;
      return client.fetchFile(path);
    };
  }
  formDef.header_actions = (def.header_actions || []).filter((button: any) => {
    const action = (config.actions || []).find((candidate: any) => candidate.id === button.id);
    return action
      && hasPermission(ctx.user, action.permission)
      && (!button.show_if || Boolean(evalExpr(button.show_if, ctx)));
  });
  const comp = new OdooFormView(
    `odoo-form-view-${def.source || def.id || Date.now()}`,
    {
      record: sourceResult.data || {},
      messages: dataMap[def.message_source]?.data || [],
      followers: dataMap[def.follower_source]?.data || [],
      followerCandidates: dataMap[def.follower_candidates_source]?.data || [],
      attachments: dataMap[def.attachment_source]?.data || [],
      editing: def.initial_editing === true,
    },
    formDef,
  );
  const slot = html.take(targetContainer).div.className('o-form-view-slot').ele() as HTMLElement;
  comp._onAction = async (actionId: string, params: any) => {
    const actionDef = (config.actions || []).find((action: any) => action.id === actionId);
    if (!actionDef) return;
    // A form chatter composes in place, but retains the normal YAML
    // server_form contract for every other invocation of the same action.
    if (actionDef.type === 'server_form' && typeof params?.content === 'string') {
      await client.action(actionDef.action, {
        ...resolveActionParams(actionDef.params, { ...ctx, row: params }),
        values: { content: params.content },
      });
      if (actionDef.refresh?.length) await refreshSources(actionDef.refresh);
      return;
    }
    return handleAction(actionDef, params || {});
  };
  comp.state.onInlineSave = async (values: Record<string, unknown>) => {
    if (!editAction) return;
    await handleInlineForm(editAction, values);
  };
  comp.mount(slot);
  const bind = (sourceId: string | undefined, stateKey: string) => bindSource(sourceId, data => {
    comp.setState({ [stateKey]: data.data || (stateKey === 'record' ? {} : []) }, true);
  });
  bind(def.source, 'record');
  bind(def.message_source, 'messages');
  bind(def.follower_source, 'followers');
  bind(def.follower_candidates_source, 'followerCandidates');
  bind(def.attachment_source, 'attachments');
  return def.content_slot ? comp.getEmbeddedContent() : undefined;
}

async function renderMoneySummary(def: any, targetContainer: HTMLElement) {
  const { MoneySummary } = await import('@core3/client/components/MoneySummary');
  const sourceResult = dataMap[def.source] || { data: {} };
  const comp = new MoneySummary(
    `money-summary-${def.source || def.id || Date.now()}`,
    { record: sourceResult.data || {} },
    def,
  );
  const slot = html.take(targetContainer).div.className('o-form-section o-form-totals-slot').ele() as HTMLElement;
  comp.mount(slot);
  bindSource(def.source, data => comp.setState({ record: data.data || {} }, true));
}

async function renderApprovalTimeline(def: any, targetContainer: HTMLElement) {
  const { ApprovalTimeline } = await import('@core3/client/components/ApprovalTimeline');
  const sourceResult = dataMap[def.source] || { data: [] };
  const comp = new ApprovalTimeline(
    `approval-timeline-${def.source || def.id || Date.now()}`,
    { events: sourceResult.data || [] },
    def,
  );
  const slot = html.take(targetContainer).div.css('marginBottom', '24px').ele() as HTMLElement;
  comp.mount(slot);
  bindSource(def.source, data => comp.setState({ events: data.data || [] }, true));
}

async function renderChatWorkspace(def: any, targetContainer: HTMLElement) {
  const { ChatWorkspace } = await import('@core3/client/components/ChatWorkspace');
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
  def.load_messages = async (threadId: string) => {
    const result = await refetchSource(messageSource, { thread_id: threadId }, 0, Number(def.message_page_size || 100));
    _origSetState({ messages: result.data || [] }, true);
  };
  if (def.refresh_interval_ms && !def.sse?.endpoint && !def.websocket?.endpoint) {
    def.on_refresh = async () => {
      await refreshSources([threadSource, messageSource, attachmentSource].filter(Boolean));
    };
  }
  def.on_sse = (payload: any) => {
    const sources = payload?.sources || {};
    const update: any = {};
    if (sources[threadSource]) update.threads = sources[threadSource].data || [];
    if (sources[messageSource]) update.messages = sources[messageSource].data || [];
    if (sources[attachmentSource]) update.attachments = sources[attachmentSource].data || [];
    if (Object.keys(update).length) _origSetState(update, true);
  };
  def.on_chat_ack = (payload: any) => comp.handleChatAck(payload);
  comp._onAction = async (actionId: string, params: any) => {
    const actionDef = (config.actions || []).find(action => action.id === actionId);
    if (actionDef) return handleAction(actionDef, params?.row || params || {});
  };
  const slot = html.take(targetContainer).div.css('marginBottom', '24px').ele() as HTMLElement;
  comp.mount(slot);

  bindSource(threadSource, data => _origSetState({ threads: data.data || [] }, true));
  bindSource(messageSource, data => _origSetState({ messages: data.data || [] }, true));
  bindSource(attachmentSource, data => _origSetState({ attachments: data.data || [] }, true));
}

async function renderStatusTabs(def: any, targetContainer: HTMLElement) {
  const { StatusTabs } = await import('@core3/client/components/StatusTabs');
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
  const slot = html.take(targetContainer).div.css('marginBottom', '16px').ele() as HTMLElement;
  comp.mount(slot);
  bindSource(def.source, () => { if (def.show_counts !== false) void refreshStatusTabCounts(def.source, comp, def); });
}

async function renderListToolbar(def: any, targetContainer: HTMLElement) {
  const { ListToolbar } = await import('@core3/client/components/ListToolbar');
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
      const { downloadCsv, toCsv } = await import('@core3/client/list-utils');
      const { downloadXlsx, toXlsx } = await import('@core3/client/xlsx-utils');
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
  const slot = html.take(targetContainer).div.css('marginBottom', '16px').ele() as HTMLElement;
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
  const { Chart } = await import('@core3/client/components/Chart');
  const sourceResult = def.source ? dataMap[def.source] : { data: def.rows || [] };
  const comp = new Chart(
    `chart-${def.source || def.id || Date.now()}`,
    chartState(def, sourceResult),
    def
  );

  const slot = html.take(targetContainer).div.css('marginBottom', '24px').ele() as HTMLElement;
  if (def.layout === 'inline') {
    html.take(slot).css('display', 'inline-block').css('verticalAlign', 'top').css('marginRight', '16px');
  }
  comp.mount(slot);

  bindSource(def.source, data => comp.setState(chartState(def, data), true));
}

async function renderTabGroupDef(def: any, targetContainer: HTMLElement) {
  const visibleTabs = (def.tabs || []).filter(tab =>
    hasPermission(ctx.user, tab.permission)
  );
  if (!visibleTabs.length) return;

  const wrap = html.take(targetContainer).div.className('tab-group').ele() as HTMLElement;
  const tabBar = html.take(wrap).div.className('tab-bar').attr('role', 'tablist').ele() as HTMLElement;
  const panels: HTMLElement[] = [];
  for (const [i, tab] of visibleTabs.entries()) {
    const panel = html.take(wrap).div.className(`tab-panel${i === 0 ? '' : ' tab-panel-hidden'}`).id(`${config.page.id}-tab-panel-${i}`).attr('role', 'tabpanel').ele() as HTMLElement;
    panels.push(panel);
    for (const nestedDef of (tab.components || [])) await renderComponentDef(nestedDef, panel);
  }

  const tabBtns = visibleTabs.map((tab, i) => {
    const btn = html.take(tabBar).button.type('button').replaceText(tab.label).className(`tab-button${i === 0 ? ' is-active' : ''}`).attr('aria-selected', String(i === 0)).attr('role', 'tab').id(`${config.page.id}-tab-${i}`).attr('aria-controls', panels[i].id).ele() as HTMLButtonElement;
    html.take(panels[i]).attr('aria-labelledby', btn.id);
    return btn;
  });

  tabBtns.forEach((btn, i) => {
    html.take(btn).event('click', () => {
      tabBtns.forEach((b, j) => {
        html.take(b).toggleClass('is-active', j === i).attr('aria-selected', String(j === i));
        html.take(panels[j]).toggleClass('tab-panel-hidden', j !== i);
      });
    });
  });
}

async function renderComponentDef(def: any, targetContainer: HTMLElement) {
  switch (def.type) {
    case 'LoginForm': {
      const { LoginForm } = await import('@core3/client/components/LoginForm');
      const component = new LoginForm(def.id || `${config.page.id}-login`, {}, def);
      component._onAction = async (actionId: string, params: any) => {
        const actionDef = (config.actions || []).find((action: any) => action.id === actionId);
        if (actionDef) await handleAction(actionDef, params);
      };
      const slot = html.take(targetContainer).div.ele() as HTMLElement;
      component.mount(slot);
      break;
    }
    case 'Html': {
      const { Html } = await import('@core3/client/components/Html');
      const runtimeContext = ctx.context || {};
      const runtimeUser = { ...ctx.user, ...(runtimeContext.user || {}) };
      if (runtimeContext.company !== undefined) runtimeUser.company = runtimeContext.company;
      const component = new Html(def.id || `${config.page.id}-html`, { context: { ...ctx, ...runtimeContext, user: runtimeUser } }, def);
      component._onAction = async (actionId: string, params: any) => {
        const actionDef = (config.actions || []).find((action: any) => action.id === actionId);
        if (actionDef) await handleAction(actionDef, params);
      };
      const slot = html.take(targetContainer).div.ele() as HTMLElement;
      component.mount(slot);
      break;
    }
    case 'AvatarPicker': {
      const component = new AvatarPicker(def.id || `${config.page.id}-avatar`, { user: ctx.user }, def);
      component._onAction = async (actionId: string, params: any) => {
        const actionDef = (config.actions || []).find((action: any) => action.id === actionId);
        if (actionDef) await handleAction(actionDef, params);
      };
      const slot = html.take(targetContainer).div.ele() as HTMLElement;
      component.mount(slot);
      break;
    }
    case 'ChoiceGroup': {
      const { ChoiceGroup } = await import('@core3/client/components/ChoiceGroup');
      const component = new ChoiceGroup(def.id || `${config.page.id}-choices`, { record: ctx.user }, def);
      component._onAction = async (actionId: string, params: any) => {
        const actionDef = (config.actions || []).find((action: any) => action.id === actionId);
        if (actionDef) await handleAction(actionDef, params);
      };
      const slot = html.take(targetContainer).div.ele() as HTMLElement;
      component.mount(slot);
      break;
    }
    case 'Form': {
      const { Form } = await import('@core3/client/components/Form');
      const component = new Form(def.id || `${config.page.id}-form`, {}, def);
      component._onAction = async (actionId: string, params: any) => {
        const actionDef = (config.actions || []).find((action: any) => action.id === actionId);
        if (actionDef) await handleAction(actionDef, params);
      };
      const slot = html.take(targetContainer).div.ele() as HTMLElement;
      component.mount(slot);
      break;
    }
    case 'Button': {
      const { Button } = await import('@core3/client/components/Button');
      const component = new Button(def.id || `${config.page.id}-action`, {}, def);
      component._onAction = async (actionId: string, params: any) => {
        const actionDef = (config.actions || []).find((action: any) => action.id === actionId);
        if (actionDef) await handleAction(actionDef, params);
      };
      const slot = html.take(targetContainer).div.ele() as HTMLElement;
      component.mount(slot);
      break;
    }
    case 'PageIntro': {
      const { PageIntro } = await import('./PageIntro.ts');
      const component = new PageIntro(def.id || `${config.page.id}-intro`, def);
      const slot = html.take(targetContainer).div.ele() as HTMLElement;
      component.mount(slot);
      break;
    }
    case 'ComingSoon': {
      const { ComingSoon } = await import('@core3/client/components/ComingSoon');
      const component = new ComingSoon(def.id || `${config.page.id}-coming-soon`, def);
      const slot = html.take(targetContainer).div.ele() as HTMLElement;
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
    case 'ListView':
      await renderListView(def, targetContainer);
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
    case 'OdooFormView':
      return renderOdooFormView(def, targetContainer);
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
      const slot = html.take(targetContainer).div.css('marginBottom', '24px').ele() as HTMLElement;
        comp.mount(slot);
      } else {
        console.error(`[page-renderer] Unknown component type: ${def.type}`);
      }
  }
}

async function renderTemplatePreview(def: any, targetContainer: HTMLElement) {
  const { TemplatePreview } = await import('@core3/client/components/TemplatePreview');
  const component = new TemplatePreview(
    `template-preview-${def.id || def.source || Date.now()}`,
    {
      template: (dataMap[def.template_source]?.data || {}) as Record<string, unknown>,
      blocks: (dataMap[def.source]?.data || []) as Array<Record<string, unknown>>,
    },
  );
  const slot = html.take(targetContainer).div.css('marginBottom', '24px').ele() as HTMLElement;
  component.mount(slot);
  bindSource(def.source, data => component.setState({
    blocks: Array.isArray(data.data) ? data.data : [],
    template: (dataMap[def.template_source]?.data || {}) as Record<string, unknown>,
  }, true));
}


  return { chartState, renderComponentDef };
}

}
