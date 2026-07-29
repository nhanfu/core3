import { OdooKanban } from '@core3/framework/components/OdooKanban.ts';
import { OdooControlPanel } from '@core3/framework/components/OdooControlPanel.ts';
import { OdooListView } from '@core3/framework/components/OdooListView.ts';
import { OdooFormView } from '@core3/framework/components/OdooFormView.ts';
import { OdooCalendarView, OdooGraphView, OdooPivotView } from '@core3/framework/components/OdooAnalyticsViews.ts';
import { OdooPageHeader } from '@core3/framework/components/OdooPageHeader.ts';
import { OdooChatter } from '@core3/framework/components/OdooChatter.ts';
import { OdooState } from '@core3/framework/components/OdooState.ts';
import { OdooStatusbar } from '@core3/framework/components/OdooStatusbar.ts';
import { OdooStatButton } from '@core3/framework/components/OdooStatButton.ts';
import { html } from '@core3/framework/html.ts';
import { OdooShell } from '@core3/framework/components/OdooShell.ts';
import { ActionRouter, NotificationCenter } from '@core3/framework/services/index.ts';

const app = document.querySelector('#app') as HTMLElement;
const currentRole = new URLSearchParams(location.search).get('role') === 'manager' ? 'manager' : 'salesperson';
const canManage = currentRole === 'manager';
type ModuleDefinition = { module: { name: string }; models?: Record<string, any>; views?: Record<string, any>; actions?: any[]; menus?: any[] };
type ListQuery = { search?: string; filter?: string; sort?: string; groupBy?: string };
let moduleDefinition: ModuleDefinition;
let shell: OdooShell;
const router = new ActionRouter('/');
const notifications = new NotificationCenter();
const labels: Record<string, string> = { assigned_to_me: 'Assigned to me', unassigned: 'Unassigned', open: 'Open', won: 'Won', lost: 'Lost', overdue: 'Overdue', activity_status: 'Activity status', stage_id: 'Stage', salesperson: 'Salesperson', team: 'Sales Team', partner_name: 'Customer', expected_closing: 'Closing month' };

function notify(level: 'info' | 'success' | 'warning' | 'error', message: string) {
  const item = notifications.push({ level, message });
  shell?.setNotificationCount(notifications.list().length);
  return item;
}

void bootstrap();

async function bootstrap() {
  moduleDefinition = await (await apiFetch('/api/crm/module')).json();
  const searchView = moduleDefinition.views?.['crm.lead']?.search || {};
  if (searchView.filters?.length) filterOptions = searchView.filters.map((value: string) => ({ value, label: labels[value] || value }));
  if (searchView.group_by?.length) groupOptions = [{ value: '', label: 'No grouping' }, ...searchView.group_by.map((value: string) => ({ value, label: labels[value] || value }))];
  const nav = (moduleDefinition.menus || [])
    .filter(menu => menu.id !== 'crm.root' && (menu.action || menu.id === 'crm.activities' || menu.id === 'crm.reporting' || menu.id === 'crm.settings'))
    .map(menu => ({ id: menu.id.replace('crm.', ''), label: menu.label, icon: menu.icon || iconFor(menu.id) }));
  shell = new OdooShell('crm-shell', {
    appName: moduleDefinition.module.name,
    appIcon: 'users',
    companyName: 'My Company (San Francisco)',
    userName: `Mitchell Admin (${currentRole})`,
    activeNav: 'pipeline',
    nav,
  });
  shell._onAction = async (action: string, params: any) => {
    if (action === 'notifications') return alert('No new notifications.');
    if (action === 'user_menu') return alert(`${params.user || 'User'}\nMy profile\nPreferences\nLog out`);
    if (action !== 'navigate') return;
    shell.setActiveNav(params.id);
    if (params.id === 'pipeline') void renderPipeline();
    else if (params.id === 'leads') void renderList();
    else renderPlaceholder(menuLabel(params.id));
  };
  shell.mount(app);
  window.addEventListener('keydown', event => {
    if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
      (document.querySelector('.odoo-search') as HTMLInputElement | null)?.focus();
    }
    if (event.altKey && event.key === '1') { event.preventDefault(); shell.setActiveNav('pipeline'); void renderPipeline(); }
    if (event.altKey && event.key === '2') { event.preventDefault(); shell.setActiveNav('leads'); void renderList(); }
  });
  router.listen(state => void renderFromRoute(state, true));
  void renderFromRoute(router.read(), true);
}

async function renderFromRoute(state: Record<string, string>, fromHistory = false) {
  const view = state.view || 'pipeline';
  if (view === 'list') { shell.setActiveNav('leads'); return renderList(state.search || '', menuLabel('leads'), 'list', state, fromHistory); }
  if (view === 'form') { shell.setActiveNav('leads'); return renderForm(state.id || undefined, fromHistory); }
  if (view === 'graph' || view === 'pivot' || view === 'calendar') return renderAnalyticsView(view, state.search || '', fromHistory);
  shell.setActiveNav('pipeline'); return renderPipeline(state.search || '', state, fromHistory);
}

function action(id: string) { return (moduleDefinition.actions || []).find(item => item.id === id) || {}; }
function menuLabel(id: string) { return (moduleDefinition.menus || []).find(item => item.id === `crm.${id}`)?.label || id; }
function iconFor(id: string) { return ({ 'crm.pipeline': 'activity', 'crm.leads': 'users', 'crm.activities': 'calendar', 'crm.reporting': 'analytics', 'crm.settings': 'settings' } as Record<string, string>)[id] || 'grid'; }

let filterOptions = [
  { value: 'all', label: 'All records' }, { value: 'assigned_to_me', label: 'Assigned to me' },
  { value: 'unassigned', label: 'Unassigned' }, { value: 'open', label: 'Open' },
  { value: 'won', label: 'Won' }, { value: 'lost', label: 'Lost' },
  { value: 'overdue', label: 'Overdue' }, { value: 'activity_status', label: 'With activity' },
];
let groupOptions = [
  { value: '', label: 'No grouping' }, { value: 'stage_id', label: 'Stage' },
  { value: 'salesperson', label: 'Salesperson' }, { value: 'team', label: 'Sales Team' },
  { value: 'partner_name', label: 'Customer' }, { value: 'expected_closing', label: 'Closing month' },
];
const sortOptions = [{ value: 'recent', label: 'Recently created' }, { value: 'revenue', label: 'Expected revenue' }, { value: 'closing', label: 'Expected closing' }];

function modelFields() { return moduleDefinition.models?.['crm.lead']?.fields || {}; }
function field(name: string, fallback: any = {}) { const definition = modelFields()[name] || fallback; return { name, label: definition.label || name.replaceAll('_', ' '), ...definition }; }
function formFields() {
  return (moduleDefinition.views?.['crm.lead']?.form?.fields || []).map((name: string) => {
    const definition = field(name);
    const options = definition.options || (name === 'stage_id' ? ['new', 'qualified', 'proposition', 'won', 'lost'] : undefined);
    return { name, label: definition.label, type: definition.type === 'monetary' || definition.type === 'number' || definition.type === 'integer' ? 'number' : definition.type === 'selection' || name === 'stage_id' ? 'select' : definition.type === 'date' ? 'date' : definition.type === 'html' ? 'textarea' : definition.type === 'boolean' ? 'checkbox' : 'text', options: options?.map((option: string) => ({ value: option, label: option[0].toUpperCase() + option.slice(1) })), list: definition.relation === 'res.partner' ? 'crm-partners' : undefined };
  });
}

async function loadJson<T>(url: string, container: HTMLElement): Promise<T | null> {
  const state = new OdooState(`state-${Date.now()}`);
  state.mount(container);
  try {
    const response = await apiFetch(url);
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const value = await response.json() as T;
    state.remove();
    return value;
  } catch (error) {
    state.setState({ mode: 'error', message: error instanceof Error ? error.message : 'Request failed' });
    notify('error', error instanceof Error ? error.message : 'Request failed');
    return null;
  }
}

function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('X-CRM-Role', currentRole);
  return fetch(input, { ...init, headers });
}

async function renderPipeline(search = '', query: ListQuery = {}, fromHistory = false) {
  const route = { view: 'pipeline', search: search || undefined, filter: query.filter, groupBy: query.groupBy, sort: query.sort };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('pipeline-header', { eyebrow: 'Sales', title: menuLabel('pipeline'), actions: [{ id: 'new', label: 'New', variant: 'primary' }, { id: 'import', label: 'Import' }] });
  header._onAction = async (_event: string, params: any) => params.id === 'new' ? renderForm() : alert('Import is provided by the generic data actions.');
  header.mount(content);

  const control = new OdooControlPanel('pipeline-controls', { search }, {
    placeholder: 'Search opportunities…',
    views: action('crm.pipeline').views || ['kanban'],
    activeView: 'kanban',
    filterOptions, groupOptions, sortOptions,
    favoriteKey: 'core3:crm:pipeline:favorites',
  });
  control._onAction = async (event: string, params: any) => {
    if (event === 'search') void renderPipeline(params.query || '', { ...query, search: params.query || '' });
    else if (event === 'view' && params.view === 'list') void renderList(params.search || '', menuLabel('pipeline'), 'list');
    else if (event === 'view' && ['calendar', 'graph', 'pivot'].includes(params.view)) void renderAnalyticsView(params.view, params.search || '');
    else if (event === 'control') {
      const next = { ...query, search: control.state.search || search };
      if (params.control === 'filter') next.filter = params.value;
      if (params.control === 'group') next.groupBy = params.value;
      if (params.control === 'sort') next.sort = params.value;
      if (params.control === 'favorite_saved') notify('success', 'Favorite filter saved.');
      if (params.control === 'favorite_apply') Object.assign(next, params.favorite || {});
      void renderPipeline(next.search || '', next);
    }
  };
  control.mount(content);

  const pipelineParams = new URLSearchParams({ search, filter: query.filter || 'all', sort: query.sort || 'recent' });
  const columns = await loadJson<any[]>(`/api/crm/pipeline?${pipelineParams}`, content);
  if (!columns) return;
  const kanban = new OdooKanban('crm-pipeline', { columns, actions: canManage ? ['assign', 'won', 'lost', 'archive', 'delete'] : ['won', 'lost'] });
  kanban._onAction = async (action: string, params: any) => {
    if (action === 'stage_change') {
      await apiFetch('/api/crm/stage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
      await renderPipeline(control.state.search || '');
    } else if (action === 'open_record') {
      void renderForm(params.id);
    } else if (action === 'quick_create') {
      const title = window.prompt(`New opportunity in ${params.stage_id}`);
      if (title?.trim()) {
        await apiFetch('/api/crm/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: title.trim(), stage_id: params.stage_id, type: 'opportunity' }) });
        await renderPipeline(control.state.search || '');
      }
    } else if (action === 'record_action') {
      const operation = params.action === 'won' || params.action === 'lost' ? 'stage' : params.action;
      const value = params.action === 'won' || params.action === 'lost' ? params.action : params.action === 'assign' ? (window.prompt('Assign to salesperson', 'Mitchell Admin') || '') : '';
      if (params.action !== 'delete' || window.confirm('Delete this opportunity?')) {
        await apiFetch('/api/crm/mutate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [params.id], operation, value }) });
        await renderPipeline(control.state.search || '');
      }
    }
  };
  kanban.mount(content);
}

async function renderList(search = '', title = menuLabel('leads'), activeView = 'list', query: ListQuery = {}, fromHistory = false) {
  const route = { view: 'list', search: search || undefined, filter: query.filter, groupBy: query.groupBy, sort: query.sort };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  let loadedRows: any[] = [];
  const header = new OdooPageHeader('list-header', { eyebrow: 'Sales', title, actions: [{ id: 'new', label: 'New', variant: 'primary' }, { id: 'export', label: 'Export' }] });
  header._onAction = async (_action: string, params: any) => params.id === 'export' ? downloadCsv(loadedRows) : renderForm();
  header.mount(content);
  const actionId = title === menuLabel('pipeline') ? 'crm.pipeline' : 'crm.leads';
  const control = new OdooControlPanel('lead-controls', { search }, {
    placeholder: 'Search leads and opportunities…',
    views: action(actionId).views || ['list'],
    activeView,
    filterOptions, groupOptions, sortOptions,
    favoriteKey: `core3:crm:${actionId}:favorites`,
  });
  control._onAction = async (event: string, params: any) => {
    if (event === 'search') void renderList(params.query || '', title, activeView, { ...query, search: params.query || '' });
    else if (event === 'view' && params.view === 'kanban') void renderPipeline(params.search || '');
    else if (event === 'view' && ['calendar', 'graph', 'pivot'].includes(params.view)) void renderAnalyticsView(params.view, params.search || '');
    else if (event === 'control') {
      const next = { ...query, search: control.state.search || search };
      if (params.control === 'filter') next.filter = params.value;
      if (params.control === 'group') next.groupBy = params.value;
      if (params.control === 'sort') next.sort = params.value;
      if (params.control === 'favorite_saved') notify('success', 'Favorite filter saved.');
      if (params.control === 'favorite_apply') Object.assign(next, params.favorite || {});
      void renderList(next.search || '', title, activeView, next);
    }
  };
  control.mount(content);
  const type = action(actionId).context?.default_type || '';
  const params = new URLSearchParams({ search, type, filter: query.filter || 'all', sort: query.sort || 'recent', group_by: query.groupBy || '' });
  const rows = await loadJson<any[]>(`/api/crm/leads?${params}`, content);
  if (!rows) return;
  loadedRows = rows;
  const columnNames = moduleDefinition.views?.['crm.lead']?.list?.columns || ['name', 'partner_name', 'salesperson', 'stage_id', 'expected_revenue', 'priority'];
  const columns = columnNames.map((name: string) => {
    const definition = field(name);
    return { field: name === 'stage_id' ? 'stage_name' : name, label: definition.label, link: name === 'name', format: name === 'expected_revenue' ? 'money' : name === 'priority' ? 'priority' : name === 'stage_id' ? 'stage' : undefined };
  });
  const list = new OdooListView('crm-lead-list', { rows }, [
  ], { selectable: true });
  list.columns = columns;
  list._onAction = async (event: string, params: any) => {
    if (event === 'open_record') void renderForm(params.id);
    if (event === 'selection' && params.ids?.length) {
      const operation = window.prompt(`Bulk action: ${canManage ? 'archive, delete, assign, stage, or merge' : 'stage'}`, canManage ? 'archive' : 'stage') || '';
      if (['archive', 'delete', 'assign', 'stage', 'merge'].includes(operation) && (operation !== 'delete' || window.confirm('Delete selected records?'))) {
        const value = operation === 'assign' ? window.prompt('Assign to salesperson', 'Mitchell Admin') || '' : operation === 'stage' ? window.prompt('Stage id', 'qualified') || '' : '';
        await apiFetch('/api/crm/mutate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: params.ids, operation, value }) });
        void renderList(search, title, activeView, query);
      }
    }
  };
  list.mount(content);
}

function downloadCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return notify('info', 'There are no records to export.');
  const columns = ['name', 'type', 'partner_name', 'salesperson', 'stage_name', 'expected_revenue', 'priority'];
  const csv = [columns.join(','), ...rows.map(row => columns.map(column => JSON.stringify(String(row[column] ?? ''))).join(','))].join('\n');
  const link = html.create('a').attr('href', URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))).attr('download', 'crm-records.csv').getContext();
  html.take(document.body).append(link);
  link.click();
  link.remove();
}

async function renderAnalyticsView(view: 'calendar' | 'graph' | 'pivot', search = '', fromHistory = false) {
  const route = { view, search: search || undefined };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('analytics-header', { eyebrow: 'Sales', title: view[0].toUpperCase() + view.slice(1), actions: [{ id: 'new', label: 'New', variant: 'primary' }] });
  header._onAction = async () => renderForm();
  header.mount(content);
  const control = new OdooControlPanel('analytics-controls', { search }, { placeholder: 'Search opportunities…', views: action('crm.pipeline').views || [], activeView: view, filterOptions, groupOptions, sortOptions, favoriteKey: 'core3:crm:pipeline:favorites' });
  control._onAction = async (event: string, params: any) => {
    if (event === 'search') void renderAnalyticsView(view, params.query || '');
    else if (event === 'view' && params.view === 'kanban') void renderPipeline(params.search || '');
    else if (event === 'view' && params.view === 'list') void renderList(params.search || '', menuLabel('pipeline'), 'list');
    else if (event === 'view' && ['calendar', 'graph', 'pivot'].includes(params.view)) void renderAnalyticsView(params.view, params.search || '');
    else if (event === 'control') {
      if (params.control === 'favorite_saved') notify('success', 'Favorite filter saved.');
      if (params.control !== 'favorite_saved' && params.control !== 'favorite_apply') notify('info', `${params.control} filter is available from the shared search contract.`);
    }
  };
  control.mount(content);
  const rows = await loadJson<any[]>(`/api/crm/leads?search=${encodeURIComponent(search)}`, content);
  if (!rows) return;
  if (view === 'graph') {
    const graph = new OdooGraphView('crm-graph', { rows, labelField: 'stage_name', valueField: 'expected_revenue' });
    graph.mount(content);
  } else if (view === 'pivot') {
    const pivot = new OdooPivotView('crm-pivot', { rows, rowField: 'salesperson', columnField: 'stage_name', measureField: 'expected_revenue' });
    pivot.mount(content);
  } else {
    const calendar = new OdooCalendarView('crm-calendar', { rows, titleField: 'name', dateField: 'created_at', detailField: 'next_activity' });
    calendar.mount(content);
  }
}

async function renderForm(id?: string, fromHistory = false) {
  const route = { view: 'form', id };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  window.onbeforeunload = null;
  const record = id ? await loadJson<any>(`/api/crm/leads/${encodeURIComponent(id)}`, content) : { type: 'opportunity', stage_id: 'new', priority: 0 };
  if (!record) return;
  const extras = id ? await loadJson<any>(`/api/crm/leads/${encodeURIComponent(id)}/extras`, content) : { messages: [], activities: [], followers: [], attachments: [] };
  if (!extras) return;
  const formView = new OdooFormView('crm-lead-form', { record }, formFields());
  formView._onAction = async (event: string, values: any) => { if (event === 'save') await saveForm(values, id); };
  clearContent(content);
  const header = new OdooPageHeader('form-header', { eyebrow: record.type === 'lead' ? 'Lead' : 'Opportunity', title: id ? record.name || 'Opportunity' : 'New Opportunity', actions: [
    { id: 'save', label: 'Save', variant: 'primary' }, { id: 'discard', label: 'Discard' },
    ...(id ? [{ id: 'duplicate', label: 'Duplicate' }, ...(canManage ? [{ id: 'archive', label: 'Archive' }, { id: 'delete', label: 'Delete' }] : [])] : []),
  ] });
  header._onAction = async (_event: string, params: any) => {
    if (params.id === 'save') return formView.save();
    if (params.id === 'discard') return renderPipeline();
    if (!id) return;
    if (params.id === 'duplicate') return renderForm();
    if (window.confirm(`${params.id[0].toUpperCase() + params.id.slice(1)} this record?`)) {
      await apiFetch('/api/crm/mutate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], operation: params.id }) });
      return renderPipeline();
    }
  };
  header.mount(content);
  const chatter = renderChatter(id, extras);
  const formContainer = html.create('div').className('odoo-form-stack').getContext();
  const chatterContainer = html.create('div').getContext();
  const stats = html.create('div').className('odoo-form-stats').getContext();
  const activityStat = new OdooStatButton('activity-stat', { value: extras.activities?.length || 0, label: 'Scheduled activities' });
  activityStat._onAction = async () => notify('info', 'Activities are shown in the Chatter panel.');
  activityStat.mount(stats);
  const statusbar = new OdooStatusbar('lead-statusbar', { value: record.stage_id, stages: ['new', 'qualified', 'proposition', 'won', 'lost'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) });
  statusbar._onAction = async (_action: string, params: any) => {
    if (!id) return;
    await apiFetch('/api/crm/stage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stage_id: params.value }) });
    await renderForm(id);
  };
  statusbar.mount(formContainer);
  html.take(formContainer).append(stats);
  formView.mount(formContainer);
  chatter.mount(chatterContainer);
  if (id && formView.form) void loadPartners(formView.form);
  html.take(content).div.className('odoo-form-layout').append(formContainer).append(chatterContainer).getContext();
  const initialFormValues = JSON.stringify([...new FormData(formView.form).entries()]);
  window.onbeforeunload = () => formView.form && JSON.stringify([...new FormData(formView.form).entries()]) !== initialFormValues ? 'Unsaved changes' : undefined;
}

async function saveForm(values: Record<string, FormDataEntryValue>, id?: string) {
  if (id) values.id = id;
  await apiFetch('/api/crm/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
  shell.setActiveNav('pipeline'); await renderPipeline();
}

function renderChatter(id: string | undefined, extras: any) {
  const chatter = new OdooChatter('record-chatter', extras);
  chatter._onAction = async (event: string, params: any) => {
    if (!id || !String(params.body || params.summary || params.name || '').trim()) return;
    if (event === 'message') await postExtra(id, { kind: 'message', body: params.body });
    if (event === 'activity') await postExtra(id, { kind: 'activity', activity_type: 'To-do', summary: params.summary, due_date: new Date().toISOString().slice(0, 10) });
    if (event === 'follower') await postExtra(id, { kind: 'follower', name: params.name });
    if (event === 'attachment') await postExtra(id, { kind: 'attachment', name: params.name });
    await renderForm(id);
  };
  return chatter;
}

async function postExtra(id: string, body: Record<string, unknown>) {
  await apiFetch(`/api/crm/leads/${encodeURIComponent(id)}/extras`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function loadPartners(form: HTMLFormElement) {
  const datalist = html.create('datalist').id('crm-partners').getContext();
  const rows = await (await apiFetch('/api/crm/partners')).json();
  for (const row of rows) html.take(datalist).option.attr('value', row.name);
  html.take(form).append(datalist);
}

function renderPlaceholder(id: string) {
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  const placeholder = html.take(content).div.className('odoo-placeholder').getContext();
  html.take(placeholder).strong.text(id[0].toUpperCase() + id.slice(1));
  html.take(placeholder).span.text('This action is registered; its screen is the next implementation slice.');
  const back = html.take(placeholder).button.className('odoo-button primary').type('button').text('Back to Pipeline').getContext();
  back.addEventListener('click', () => { shell.setActiveNav('pipeline'); void renderPipeline(); });
}

function clearContent(content: HTMLElement) { window.onbeforeunload = null; html.take(content).clear(); }
