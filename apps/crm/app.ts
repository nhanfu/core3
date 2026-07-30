import { OdooKanban } from '../lib/components/OdooKanban.ts';
import { OdooControlPanel } from '../lib/components/OdooControlPanel.ts';
import { OdooListView } from '../lib/components/OdooListView.ts';
import { OdooFormView } from '../lib/components/OdooFormView.ts';
import { OdooCalendarView, OdooGraphView, OdooPivotView } from '../lib/components/OdooAnalyticsViews.ts';
import { OdooPageHeader } from '../lib/components/OdooPageHeader.ts';
import { OdooChatter } from '../lib/components/OdooChatter.ts';
import { OdooState } from '../lib/components/OdooState.ts';
import { OdooStatusbar } from '../lib/components/OdooStatusbar.ts';
import { OdooStatButton } from '../lib/components/OdooStatButton.ts';
import { OdooDialog, type OdooDialogField } from '../lib/components/OdooDialog.ts';
import { html } from '../lib/html.ts';
import { OdooShell } from '../lib/components/OdooShell.ts';
import { ActionRouter, ActionService, AppRegistry, ModuleMenuTree, NotificationCenter, UnsavedChangesGuard, type AppManifest } from '../lib/services/index.ts';
import { appendIcon } from '../lib/components/Icon.ts';

const app = document.querySelector('#app') as HTMLElement;
const requestedRole = new URLSearchParams(location.search).get('role');
const currentRole = requestedRole === 'manager' || requestedRole === 'system' ? requestedRole : 'salesperson';
const canManage = currentRole === 'manager' || currentRole === 'system';
type ModuleDefinition = { module: { name: string }; models?: Record<string, any>; views?: Record<string, any>; actions?: any[]; menus?: any[] };
type ListQuery = { search?: string; filter?: string; sort?: string; groupBy?: string; teamId?: string };
let moduleDefinition: ModuleDefinition;
let appRegistry: AppRegistry;
let actionService: ActionService;
let shell: OdooShell;
const router = new ActionRouter('/');
const notifications = new NotificationCenter();
const dirtyGuard = new UnsavedChangesGuard();
let lastRenderedRoute: Record<string, string> = {};
const labels: Record<string, string> = { assigned_to_me: 'Assigned to me', unassigned: 'Unassigned', open: 'Open', won: 'Won', lost: 'Lost', archived: 'Archived', overdue: 'Overdue', activity_status: 'Activity status', stage_id: 'Stage', salesperson: 'Salesperson', team: 'Sales Team', partner_name: 'Customer', expected_closing: 'Closing month' };

function notify(level: 'info' | 'success' | 'warning' | 'error', message: string) {
  const item = notifications.push({ level, message });
  shell?.setNotificationCount(notifications.list().length);
  return item;
}

async function requestDialog(options: { title: string; message?: string; fields?: OdooDialogField[]; confirmLabel?: string }): Promise<Record<string, FormDataEntryValue> | null> {
  const host = document.createElement('div');
  document.body.append(host);
  const dialog = new OdooDialog(`dialog-${Date.now()}`, { open: true, ...options });
  return new Promise(resolve => {
    dialog._onAction = (action: string, values: Record<string, FormDataEntryValue>) => {
      host.remove();
      resolve(action === 'submit' ? values : null);
    };
    dialog.mount(host);
  });
}

void bootstrap();

async function bootstrap() {
  const appResponse = await apiFetch(odata('modules', 'list'));
  appRegistry = new AppRegistry(await appResponse.json() as AppManifest[]);
  moduleDefinition = await (await apiFetch(odata('module', 'get'))).json();
  actionService = new ActionService(moduleDefinition.actions || [], moduleDefinition.menus || []);
  const searchView = moduleDefinition.views?.['crm.lead']?.search || {};
  if (searchView.filters?.length) filterOptions = searchView.filters.map((value: string) => ({ value, label: labels[value] || value }));
  if (searchView.group_by?.length) groupOptions = [{ value: '', label: 'No grouping' }, ...searchView.group_by.map((value: string) => ({ value, label: labels[value] || value }))];
  const menuTree = new ModuleMenuTree(moduleDefinition.menus || []);
  const nav = menuTree.tree(currentRole)
    .flatMap(menu => menu.id === 'crm.root' ? menu.children : [menu])
    .map(menu => toNavItem(menu))
    .filter(menu => menu.action || menu.children?.length);
  shell = new OdooShell('crm-shell', {
    appName: moduleDefinition.module.name,
    appIcon: 'users',
    companyName: 'My Company (San Francisco)',
    userName: `CRM User (${currentRole})`,
    apps: appRegistry.list(),
    activeApp: 'crm',
    companies: [{ id: 'sf', label: 'My Company (San Francisco)' }, { id: 'ny', label: 'My Company (New York)' }],
    activeCompany: localStorage.getItem('core3:crm:company') || 'sf',
    activeNav: 'pipeline',
    nav,
  });
  shell._onAction = async (action: string, params: any) => {
    if (action === 'app_switch') {
      if (!dirtyGuard.canLeave()) return;
      if (params.app === 'crm') return renderFromRoute(router.read(), true);
      return renderAppPlaceholder(params.manifest || appRegistry.get(params.app));
    }
    if (action === 'notifications') return notify('info', 'No new notifications.');
    if (action === 'user_menu') return requestDialog({ title: String(params.user || 'User'), message: 'Profile, preferences, and logout are available from the account menu.', confirmLabel: 'Close' });
    if (action === 'command_search') return (document.querySelector('.odoo-search') as HTMLInputElement | null)?.focus();
    if (action === 'company_switch') {
      localStorage.setItem('core3:crm:company', String(params.company || 'sf'));
      shell.setCompany(String(params.company || 'sf'));
      return notify('success', `Company context changed to ${params.company}.`);
    }
    if (action !== 'navigate') return;
    if (!dirtyGuard.canLeave()) return;
    shell.setActiveNav(params.id);
    if (params.id === 'pipeline') void renderPipeline();
    else if (params.id === 'leads') void renderList();
    else if (params.id === 'activities') void renderActivities();
    else if (params.id === 'customers') void renderCustomers();
    else if (params.id === 'teams') void renderTeams();
    else if (params.id === 'customer_form') void renderCustomerForm();
    else if (params.id === 'team_form') void renderTeamForm();
    else if (params.id === 'reporting') void renderReporting();
    else if (params.id === 'pipeline_analysis') void renderReporting();
    else if (params.id === 'leads_analysis') void renderLeadAnalysis();
    else if (params.id === 'activity_analysis') void renderActivityAnalysis();
    else if (params.id === 'forecast') void renderForecast();
    else if (params.id === 'settings') void (canManage ? renderSettings('settings') : notify('error', 'Manager permission required.'));
    else if (['stages', 'tags', 'lost_reasons', 'activity_types', 'activity_plans', 'recurring_plans'].includes(params.id)) void (canManage ? renderSettings(params.id) : notify('error', 'Manager permission required.'));
    else if (params.id === 'import') void (canManage ? renderImport() : notify('error', 'Manager permission required.'));
    else notify('warning', `Unknown CRM menu action: ${params.id}`);
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

function toNavItem(menu: any): any {
  return {
    id: menu.id.replace('crm.', ''),
    label: menu.label,
    icon: menu.icon || iconFor(menu.id),
    action: menu.action,
    children: menu.children?.map(toNavItem).filter((child: any) => child.action || child.children?.length),
  };
}

function renderAppPlaceholder(manifest?: AppManifest) {
  const content = shell.contentElement;
  if (!content || !manifest) return;
  clearContent(content);
  const placeholder = html.take(content).div.className('odoo-placeholder odoo-app-placeholder').getContext();
  const icon = html.take(placeholder).div.className('odoo-app-placeholder-icon').getContext();
  appendIcon(icon, manifest.icon || 'grid');
  html.take(placeholder).strong.text(manifest.name);
  html.take(placeholder).span.text(manifest.description || 'This application is not enabled yet.');
  const back = html.take(placeholder).button.className('odoo-button primary').type('button').text('Return to CRM').getContext();
  back.addEventListener('click', () => void renderFromRoute(router.read(), true));
}

async function renderFromRoute(state: Record<string, string>, fromHistory = false) {
  if (fromHistory && dirtyGuard.isDirty && !sameRoute(state, lastRenderedRoute) && !dirtyGuard.canLeave()) {
    router.replace(lastRenderedRoute);
    return;
  }
  const view = state.view || 'pipeline';
  if (view === 'list') { shell.setActiveNav('leads'); return renderList(state.search || '', state.teamId ? 'Team Pipeline' : menuLabel('leads'), 'list', state, fromHistory); }
  if (view === 'form') { shell.setActiveNav('leads'); return renderForm(state.id || undefined, fromHistory); }
  if (view === 'activities') { shell.setActiveNav('activities'); return renderActivities(state.search || '', { status: state.status }, state.activityView || 'list', fromHistory); }
  if (view === 'customers') { shell.setActiveNav('customers'); return renderCustomers(state.search || '', fromHistory); }
  if (view === 'teams') { shell.setActiveNav('teams'); return renderTeams(fromHistory); }
  if (view === 'customer_form') { shell.setActiveNav('customers'); return renderCustomerForm(state.id || undefined, fromHistory); }
  if (view === 'team_form') { shell.setActiveNav('teams'); return renderTeamForm(state.id || undefined, fromHistory); }
  if (view === 'reporting') { shell.setActiveNav('reporting'); return renderReporting(fromHistory, state.dimension || 'stage', state.from || '', state.to || '', state.search || ''); }
  if (view === 'forecast') { shell.setActiveNav('forecast'); return renderForecast(fromHistory); }
  if (view === 'activity_analysis') { shell.setActiveNav('activity_analysis'); return renderActivityAnalysis(state.dimension || 'activity_type', state.search || '', fromHistory); }
  if (view === 'lead_analysis') { shell.setActiveNav('leads_analysis'); return renderLeadAnalysis(state.dimension || 'source', state.search || '', fromHistory, state.analysisView === 'pivot' ? 'pivot' : 'graph'); }
  if (view === 'lead_drilldown') { shell.setActiveNav('leads_analysis'); return renderLeadDrilldown(state.dimension || 'source', state.value || '', fromHistory); }
  if (view === 'report_drilldown') return renderReportDrilldown(state.dimension || 'stage', state.value || '', fromHistory, state.secondaryDimension || '', state.secondaryValue || '');
  if (view === 'activity_drilldown') return renderActivityDrilldown(state.dimension || 'activity_type', state.value || '', fromHistory);
  if (view === 'settings') { if (!canManage) return renderPipeline('', {}, fromHistory); shell.setActiveNav(state.menu || 'settings'); return renderSettings(state.menu || 'settings', fromHistory); }
  if (view === 'import') { if (!canManage) return renderPipeline('', {}, fromHistory); shell.setActiveNav('import'); return renderImport(fromHistory); }
  if (view === 'graph' || view === 'pivot' || view === 'calendar') return renderAnalyticsView(view, state.search || '', fromHistory, state);
  shell.setActiveNav('pipeline'); return renderPipeline(state.search || '', state, fromHistory);
}

function sameRoute(left: Record<string, string>, right: Record<string, string>) {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every(key => left[key] === right[key]);
}

async function renderForecast(fromHistory = false) {
  const route = { view: 'forecast' };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('forecast-header', { eyebrow: 'Reporting', title: 'Forecast', actions: [{ id: 'new', label: 'New opportunity', variant: 'primary' }] });
  header._onAction = async () => renderForm();
  header.mount(content);
  const rows = await loadJson<any[]>(odata('leads', 'list', 'type=opportunity&filter=open&sort=closing'), content);
  if (!rows) return;
  const buckets = await loadJson<any[]>(odata('report', 'analysis', 'dimension=closing_bucket'), content);
  if (!buckets) return;
  const graph = new OdooGraphView('crm-forecast-graph', { rows: buckets, labelField: 'label', valueField: 'revenue' });
  graph._onAction = async (_event: string, params: any) => renderReportDrilldown('closing_bucket', params.label);
  graph.mount(content);
  const list = new OdooListView('crm-forecast-list', { rows }, [
    { field: 'name', label: 'Opportunity', link: true }, { field: 'stage_name', label: 'Stage' },
    { field: 'expected_closing', label: 'Expected closing' }, { field: 'probability', label: 'Probability' }, { field: 'expected_revenue', label: 'Revenue', format: 'money' },
    { field: 'recurring_revenue', label: 'Recurring', format: 'money' },
  ]);
  list._onAction = async (_event: string, params: any) => renderForm(params.id);
  list.mount(content);
}

async function renderActivityAnalysis(dimension = 'activity_type', search = '', fromHistory = false) {
  const route = { view: 'activity_analysis', dimension, search: search || undefined };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('activity-analysis-header', { eyebrow: 'Reporting', title: 'Activities analysis' });
  header.mount(content);
  const control = new OdooControlPanel('activity-analysis-controls', {}, { placeholder: 'Search activity analysis…', views: ['graph'], activeView: 'graph', filterOptions: [], groupOptions: [{ value: 'activity_type', label: 'Activity type' }, { value: 'salesperson', label: 'Responsible user' }, { value: 'due_date', label: 'Due date' }], sortOptions: [], favoriteKey: 'core3:crm:activity-analysis:favorites' });
  control._onAction = async (event: string, params: any) => {
    if (event === 'search') return renderActivityAnalysis(dimension, params.query || '', false);
    if (event === 'control' && params.control === 'group') return renderActivityAnalysis(params.value || 'activity_type', search, false);
  };
  control.mount(content);
  const rows = await loadJson<any[]>(odata('activities', 'list', `search=${encodeURIComponent(search)}`), content);
  if (!rows) return;
  const grouped = await loadJson<any[]>(odata('report', 'activity-analysis', `dimension=${encodeURIComponent(dimension)}&search=${encodeURIComponent(search)}`), content);
  if (!grouped) return;
  const graph = new OdooGraphView('crm-activity-analysis', { rows: grouped, labelField: 'label', valueField: 'scheduled', format: 'number' });
  graph._onAction = async (_event: string, params: any) => renderActivityDrilldown(dimension, params.label);
  graph.mount(content);
  const measureList = new OdooListView('crm-activity-analysis-measures', { rows: grouped }, [{ field: 'label', label: dimension, link: true }, { field: 'scheduled', label: 'Scheduled' }, { field: 'completed', label: 'Completed' }, { field: 'overdue', label: 'Overdue' }]);
  measureList._onAction = async (_event: string, params: any) => renderActivityDrilldown(dimension, params.id || params.label);
  measureList.mount(content);
  const list = new OdooListView('crm-activity-analysis-list', { rows }, [{ field: 'summary', label: 'Activity' }, { field: 'activity_type', label: 'Type' }, { field: 'due_date', label: 'Due date' }, { field: 'done', label: 'Done' }]);
  list.mount(content);
}

async function renderLeadAnalysis(dimension = 'source', search = '', fromHistory = false, activeView: 'graph' | 'pivot' = 'graph') {
  const route = { view: 'lead_analysis', dimension, search: search || undefined, analysisView: activeView };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('lead-analysis-header', { eyebrow: 'Reporting', title: 'Leads analysis' });
  header.mount(content);
  const control = new OdooControlPanel('lead-analysis-controls', { search }, { placeholder: 'Search lead analysis…', views: ['graph', 'pivot'], activeView, filterOptions: [], groupOptions: [
    { value: 'source', label: 'Source' }, { value: 'campaign', label: 'Campaign' }, { value: 'team', label: 'Sales team' }, { value: 'salesperson', label: 'Salesperson' }, { value: 'stage', label: 'Stage' },
  ], sortOptions: [], favoriteKey: 'core3:crm:lead-analysis:favorites' });
  control._onAction = async (event: string, params: any) => {
    if (event === 'search') return renderLeadAnalysis(dimension, params.query || '', false, activeView);
    if (event === 'view' && ['graph', 'pivot'].includes(params.view)) return renderLeadAnalysis(dimension, search, false, params.view);
    if (event === 'control' && params.control === 'group') return renderLeadAnalysis(params.value || 'source', search, false, activeView);
  };
  control.mount(content);
  const rows = await loadJson<any[]>(odata('report', 'lead-analysis', `dimension=${encodeURIComponent(dimension)}&search=${encodeURIComponent(search)}`), content);
  if (!rows) return;
  if (activeView === 'pivot') {
    const pivotRows = rows.flatMap(row => [{ label: row.label, type: 'Created', count: row.created_count }, { label: row.label, type: 'Converted', count: row.converted_count }]);
    const pivot = new OdooPivotView('crm-lead-analysis-pivot', { rows: pivotRows, rowField: 'label', columnField: 'type', measureField: 'count' });
    pivot._onAction = async (_event: string, params: any) => renderLeadDrilldown(dimension, params.row);
    pivot.mount(content);
  } else {
    const graph = new OdooGraphView('crm-lead-analysis', { rows, labelField: 'label', valueField: 'created_count', format: 'number' });
    graph._onAction = async (_event: string, params: any) => renderLeadDrilldown(dimension, params.label);
    graph.mount(content);
  }
  const list = new OdooListView('crm-lead-analysis-list', { rows }, [{ field: 'label', label: dimension }, { field: 'created_count', label: 'Created' }, { field: 'converted_count', label: 'Converted' }, { field: 'revenue', label: 'Revenue', format: 'money' }]);
  list.mount(content);
}

async function renderImport(fromHistory = false) {
  const route = { view: 'import' };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('import-header', { eyebrow: 'CRM', title: 'Import & Synchronize', actions: [{ id: 'import', label: 'Import CSV', variant: 'primary' }] });
  header._onAction = async () => runImport();
  header.mount(content);
  const panel = html.take(content).div.className('odoo-settings-panel').getContext();
  html.take(panel).h2.text('Import CRM records');
  html.take(panel).p.className('odoo-muted').text('Use the Import CSV action to preview, validate, and commit lead or opportunity rows.');
  html.take(panel).p.text('Required column: name. Optional columns: type, stage_id, partner_name, contact_name, email, phone, team, salesperson, source, campaign, expected_revenue, recurring_revenue, recurring_plan_id, probability, expected_closing, priority, tags, next_activity, notes.');
  if (canManage) {
    const history = await loadJson<any[]>(odata('import', 'history'), content);
    if (history) {
      html.take(panel).h2.text('Import history');
      const historyRows = history.map(row => ({ ...row, error_summary: (() => { try { return (JSON.parse(String(row.errors || '[]')) as any[]).map(item => `row ${item.row}: ${item.errors.join(', ')}`).join('; '); } catch { return String(row.errors || ''); } })() }));
      const list = new OdooListView('crm-import-history', { rows: historyRows }, [{ field: 'created_at', label: 'Date' }, { field: 'imported_count', label: 'Imported' }, { field: 'error_count', label: 'Errors' }, { field: 'error_summary', label: 'Error report' }]);
      list.mount(panel);
    }
  }
}

async function renderSettings(section = 'settings', fromHistory = false) {
  const route = { view: 'settings', menu: section === 'settings' ? undefined : section };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('settings-header', { eyebrow: 'CRM', title: menuLabel('settings'), actions: [{ id: 'save', label: 'Save', variant: 'primary' }, { id: 'add', label: 'Add configuration' }] });
  header._onAction = async (_event: string, params: any) => {
    if (params.id === 'add') {
      const values = await requestDialog({ title: 'Add CRM configuration', confirmLabel: 'Create', fields: [
        { name: 'kind', label: 'Configuration type', type: 'select', required: true, options: [
          { value: 'stage', label: 'Pipeline stage' }, { value: 'tag', label: 'Tag' }, { value: 'lost_reason', label: 'Lost reason' },
          { value: 'activity_types', label: 'Activity type' }, { value: 'activity_plans', label: 'Activity plan' }, { value: 'recurring_plans', label: 'Recurring plan' },
        ] },
        { name: 'id', label: 'Technical ID', required: true }, { name: 'name', label: 'Name', required: true },
        { name: 'color', label: 'Tag color' }, { name: 'default_summary', label: 'Default activity summary' },
        { name: 'interval_number', label: 'Recurring interval', type: 'number', value: 1 },
        { name: 'interval_unit', label: 'Interval unit', value: 'month' },
      ] });
      if (!values) return;
      const kind = String(values.kind || '');
      const headers = { 'Content-Type': 'application/json' };
      let response: Response;
      if (kind === 'stage') response = await apiFetch(odata('stages', 'save'), { method: 'POST', headers, body: JSON.stringify({ rows: [{ id: values.id, name: values.name, folded: false, requirements: '' }] }) });
      else if (kind === 'tag') response = await apiFetch(odata('tags', 'save'), { method: 'POST', headers, body: JSON.stringify({ id: values.id, name: values.name, color: values.color || '' }) });
      else if (kind === 'lost_reason') response = await apiFetch(odata('lost-reasons', 'save'), { method: 'POST', headers, body: JSON.stringify({ id: values.id, name: values.name }) });
      else response = await apiFetch(odata('catalog', 'save', `kind=${encodeURIComponent(kind)}`), { method: 'POST', headers, body: JSON.stringify({ id: values.id, name: values.name, color: values.color || '', default_summary: values.default_summary || '', interval_number: values.interval_number || 1, interval_unit: values.interval_unit || 'month' }) });
      if (response.ok) { notify('success', 'CRM configuration created.'); return renderSettings(section); }
      return notify('error', 'Unable to create CRM configuration.');
    }
    const values = Object.fromEntries([...content.querySelectorAll<HTMLInputElement>('input[data-config]')].map(input => [input.dataset.config || '', String(input.checked)]));
    const stages = [...content.querySelectorAll<HTMLInputElement>('input[data-stage-id]')].map(input => ({ id: input.dataset.stageId, name: input.value, folded: content.querySelector<HTMLInputElement>(`input[data-stage-folded="${input.dataset.stageId}"]`)?.checked || false, requirements: content.querySelector<HTMLTextAreaElement>(`textarea[data-stage-requirements="${input.dataset.stageId}"]`)?.value || '' }));
    const reasons = [...content.querySelectorAll<HTMLInputElement>('input[data-reason-id]')].map(input => ({ id: input.dataset.reasonId, name: input.value }));
    const tags = [...content.querySelectorAll<HTMLInputElement>('input[data-tag-id]')].map(input => ({ id: input.dataset.tagId, name: input.value, color: input.dataset.tagColor || '' }));
    const catalogValues = new Map<string, Record<string, unknown>>();
    for (const input of content.querySelectorAll<HTMLInputElement>('input[data-catalog-kind]')) {
      const key = `${input.dataset.catalogKind}:${input.dataset.catalogId}`;
      const row = catalogValues.get(key) || { id: input.dataset.catalogId };
      row[input.dataset.catalogField || 'name'] = input.value;
      catalogValues.set(key, row);
    }
    const headers = { 'Content-Type': 'application/json' };
    const responses = await Promise.all([
      apiFetch(odata('config', 'save'), { method: 'POST', headers, body: JSON.stringify(values) }),
      apiFetch(odata('stages', 'save'), { method: 'POST', headers, body: JSON.stringify({ rows: stages }) }),
      ...reasons.map(reason => apiFetch(odata('lost-reasons', 'save'), { method: 'POST', headers, body: JSON.stringify(reason) })),
      ...tags.map(tag => apiFetch(odata('tags', 'save'), { method: 'POST', headers, body: JSON.stringify(tag) })),
      ...[...catalogValues.entries()].map(([key, row]) => apiFetch(odata('catalog', 'save', `kind=${encodeURIComponent(key.split(':')[0])}`), { method: 'POST', headers, body: JSON.stringify(row) })),
    ]);
    if (responses.every(response => response.ok)) notify('success', 'CRM settings saved.'); else notify('error', 'You do not have permission to change CRM settings.');
  };
  header.mount(content);
  const [values, stages, reasons, tags, activityTypes, activityPlans, recurringPlans] = await Promise.all([
    loadJson<any[]>(odata('config', 'get'), content), loadJson<any[]>(odata('stages', 'list'), content), loadJson<any[]>(odata('lost-reasons', 'list'), content),
    loadJson<any[]>(odata('tags', 'list'), content),
    loadJson<any[]>(odata('catalog', 'list', 'kind=activity_types'), content), loadJson<any[]>(odata('catalog', 'list', 'kind=activity_plans'), content), loadJson<any[]>(odata('catalog', 'list', 'kind=recurring_plans'), content),
  ]);
  if (!values || !stages || !reasons || !tags || !activityTypes || !activityPlans || !recurringPlans) return;
  const panel = html.take(content).div.className('odoo-settings-panel').getContext();
  if (section === 'settings') {
    html.take(panel).h2.text('CRM features');
    html.take(panel).p.className('odoo-muted').text('Manager and system settings control which CRM workflows are available.');
    for (const item of values) {
      const label = html.take(panel).label.className('odoo-setting-row').getContext();
      const input = html.take(label).input.attr('type', 'checkbox').dataAttr('config', item.key).getContext() as HTMLInputElement;
      input.checked = item.value === 'true';
      html.take(label).span.text(item.key.replaceAll('_', ' '));
    }
  }
  if (section === 'settings' || section === 'stages') html.take(panel).h2.text('Pipeline stages');
  if (section === 'settings' || section === 'stages') for (const stage of stages) {
    const label = html.take(panel).label.className('odoo-setting-row').getContext();
    html.take(label).input.attr('type', 'text').dataAttr('stage-id', stage.id).value(stage.name);
    const folded = html.take(label).input.attr('type', 'checkbox').dataAttr('stage-folded', stage.id).getContext() as HTMLInputElement;
    folded.checked = Boolean(stage.folded);
    html.take(label).span.text('Folded');
    html.take(label).textArea.dataAttr('stage-requirements', stage.id).attr('placeholder', 'Stage requirements').text(stage.requirements || '');
    html.take(label).span.text(`${stage.id} (${stage.folded ? 'folded' : 'open'})`);
  }
  if (section === 'settings' || section === 'lost_reasons') html.take(panel).h2.text('Lost reasons');
  if (section === 'settings' || section === 'lost_reasons') for (const reason of reasons) {
    const label = html.take(panel).label.className('odoo-setting-row').getContext();
    html.take(label).input.attr('type', 'text').dataAttr('reason-id', reason.id).value(reason.name);
    html.take(label).span.text(reason.id);
  }
  if (section === 'settings' || section === 'tags') html.take(panel).h2.text('Tags');
  if (section === 'settings' || section === 'tags') for (const tag of tags) {
    const label = html.take(panel).label.className('odoo-setting-row').getContext();
    html.take(label).input.attr('type', 'text').dataAttr('tag-id', tag.id).dataAttr('tag-color', tag.color || '').value(tag.name);
    html.take(label).span.text(`${tag.id} (${tag.color || 'default'})`);
  }
  for (const [kind, title, rows] of [['activity_types', 'Activity Types', activityTypes], ['activity_plans', 'Activity Plans', activityPlans], ['recurring_plans', 'Recurring Plans', recurringPlans]] as [string, string, any[]][]) {
    if (section !== 'settings' && section !== kind) continue;
    html.take(panel).h2.text(title);
    for (const row of rows) {
      const label = html.take(panel).label.className('odoo-setting-row').getContext();
      html.take(label).input.attr('type', 'text').dataAttr('catalog-kind', kind).dataAttr('catalog-id', row.id).dataAttr('catalog-field', 'name').value(row.name);
      if (kind === 'activity_types') html.take(label).input.attr('type', 'text').dataAttr('catalog-kind', kind).dataAttr('catalog-id', row.id).dataAttr('catalog-field', 'default_summary').value(row.default_summary || '');
      if (kind === 'recurring_plans') {
        html.take(label).input.attr('type', 'number').dataAttr('catalog-kind', kind).dataAttr('catalog-id', row.id).dataAttr('catalog-field', 'interval_number').value(String(row.interval_number || 1));
        html.take(label).input.attr('type', 'text').dataAttr('catalog-kind', kind).dataAttr('catalog-id', row.id).dataAttr('catalog-field', 'interval_unit').value(row.interval_unit || 'month');
      }
      html.take(label).span.text(row.id);
    }
  }
}

async function runImport() {
  const values = await requestDialog({
    title: 'Import CRM records',
    message: 'Paste CSV data. The first row must contain column names.',
    confirmLabel: 'Preview import',
    fields: [{ name: 'csv', label: 'CSV data', type: 'textarea', required: true, placeholder: 'name,type,stage_id\nNew opportunity,opportunity,new' }],
  });
  const csv = String(values?.csv || '');
  if (!csv.trim()) return;
  const [header, ...lines] = csv.trim().split(/\r?\n/);
  const columns = parseCsvLine(header).map(value => value.trim());
  const rows = lines.filter(Boolean).map(line => Object.fromEntries(parseCsvLine(line).map((value, index) => [columns[index], value.trim()])));
  const previewResponse = await apiFetch(odata('import', 'preview'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
  const preview = await previewResponse.json();
  const invalid = preview.filter((item: any) => item.errors.length);
  if (invalid.length) return notify('error', `Import rejected: ${invalid.map((item: any) => `row ${item.row}: ${item.errors.join(', ')}`).join('; ')}`);
  const confirmed = await requestDialog({ title: 'Confirm import', message: `${rows.length} valid CRM records are ready to import.`, confirmLabel: 'Import records' });
  if (!confirmed) return;
  const commit = await apiFetch(odata('import', 'commit'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) });
  if (!commit.ok) return notify('error', 'Import failed. Manager permission is required.');
  notify('success', `Imported ${rows.length} records.`);
  await renderList();
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === ',' && !quoted) { values.push(value); value = ''; continue; }
    value += character;
  }
  values.push(value);
  return values;
}

async function renderReporting(fromHistory = false, dimension = 'stage', fromDate = '', toDate = '', search = '') {
  const route = { view: 'reporting', dimension, from: fromDate || undefined, to: toDate || undefined, search: search || undefined };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  clearContent(content);
  let reportRows: any[] = [];
  const header = new OdooPageHeader('reporting-header', { eyebrow: 'CRM', title: menuLabel('reporting'), actions: [{ id: 'pipeline', label: 'Pipeline analysis', variant: 'primary' }, { id: 'leads', label: 'Leads analysis' }, { id: 'date_range', label: fromDate || toDate ? 'Change dates' : 'Date range' }, { id: 'export', label: 'Export' }] });
  header._onAction = async (_event: string, params: any) => {
    if (params.id === 'pipeline') return renderAnalyticsView('graph');
    if (params.id === 'leads') return renderLeadAnalysis();
    if (params.id === 'export') return downloadCsv(reportRows);
    if (params.id === 'date_range') {
      const values = await requestDialog({ title: 'Report date range', confirmLabel: 'Apply', fields: [
        { name: 'from_date', label: 'Created from', type: 'date', value: fromDate },
        { name: 'to_date', label: 'Created to', type: 'date', value: toDate },
      ] });
      if (values) return renderReporting(false, dimension, String(values.from_date || ''), String(values.to_date || ''), search);
    }
  };
  header.mount(content);
  const control = new OdooControlPanel('reporting-controls', { search }, { placeholder: 'Search report groups…', views: [], activeView: 'graph', filterOptions: [], groupOptions: [{ value: 'stage', label: 'Stage' }, { value: 'salesperson', label: 'Salesperson' }, { value: 'team', label: 'Sales Team' }, { value: 'customer', label: 'Customer' }], sortOptions: [], favoriteKey: 'core3:crm:reporting:favorites' });
  control._onAction = async (event: string, params: any) => {
    if (event === 'search') return renderReporting(false, dimension, fromDate, toDate, params.query || '');
    if (event === 'control' && params.control === 'group') return renderReporting(false, params.value || 'stage', fromDate, toDate, search);
  };
  control.mount(content);
  const report = await loadJson<{ summary: Record<string, any>; byStage: any[] }>(odata('report', 'summary'), content);
  if (!report) return;
  const summary = html.take(content).div.className('odoo-report-summary').getContext();
  for (const [label, value, format] of [
    ['Open pipeline', report.summary.open_revenue, 'money'], ['Opportunities', report.summary.opportunities, 'number'],
    ['Won revenue', report.summary.won_revenue, 'money'], ['Conversion rate', report.summary.opportunities ? `${Math.round((report.summary.won / report.summary.opportunities) * 100)}%` : '0%', 'text'],
  ] as [string, any, string][]) {
    const card = html.take(summary).div.className('odoo-report-card').getContext();
    html.take(card).small.text(label);
    html.take(card).strong.text(format === 'money' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0)) : String(value));
  }
  const params = new URLSearchParams({ dimension });
  if (fromDate) params.set('from', fromDate);
  if (toDate) params.set('to', toDate);
  if (search) params.set('search', search);
  const rows = await loadJson<any[]>(odata('report', 'analysis', params.toString()), content);
  if (!rows) return;
  reportRows = rows;
  const graph = new OdooGraphView('crm-report-stage-graph', { rows, labelField: 'label', valueField: 'revenue' });
  graph._onAction = async (_event: string, params: any) => renderReportDrilldown(dimension, params.label);
  graph.mount(content);
  const reportList = new OdooListView('crm-report-measures', { rows }, [{ field: 'label', label: dimension, link: true }, { field: 'count', label: 'Count' }, { field: 'revenue', label: 'Revenue', format: 'money' }, { field: 'recurring_revenue', label: 'Recurring', format: 'money' }, { field: 'weighted_revenue', label: 'Weighted', format: 'money' }, { field: 'avg_probability', label: 'Avg probability' }]);
  reportList._onAction = async (_event: string, params: any) => renderReportDrilldown(dimension, params.id || params.label);
  reportList.mount(content);
}

async function renderCustomers(search = '', fromHistory = false) {
  const route = { view: 'customers', search: search || undefined };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('customers-header', { eyebrow: 'Sales', title: menuLabel('customers'), actions: [{ id: 'new', label: 'New', variant: 'primary' }] });
  header._onAction = async () => renderCustomerForm();
  header.mount(content);
  const control = new OdooControlPanel('customers-controls', { search }, { placeholder: 'Search customers…', views: ['list'], activeView: 'list', filterOptions: [], groupOptions: [], sortOptions: [], favoriteKey: 'core3:crm:customers:favorites' });
  control._onAction = async (event: string, params: any) => { if (event === 'search') return renderCustomers(params.query || ''); };
  control.mount(content);
  const rows = await loadJson<any[]>(odata('customers', 'list', `search=${encodeURIComponent(search)}`), content);
  if (!rows) return;
  const list = new OdooListView('crm-customers-list', { rows }, [
    { field: 'name', label: 'Customer', link: true }, { field: 'email', label: 'Email' }, { field: 'phone', label: 'Phone' },
    { field: 'opportunity_count', label: 'Opportunities' }, { field: 'expected_revenue', label: 'Expected revenue', format: 'money' },
  ]);
  list._onAction = async (_event: string, params: any) => renderCustomerForm(params.id);
  list.mount(content);
}

async function renderTeams(fromHistory = false) {
  const route = { view: 'teams' };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('teams-header', { eyebrow: 'Sales', title: menuLabel('teams'), actions: [{ id: 'new', label: 'New', variant: 'primary' }] });
  header._onAction = async () => renderTeamForm();
  header.mount(content);
  const rows = await loadJson<any[]>(odata('teams', 'list'), content);
  if (!rows) return;
  const list = new OdooListView('crm-teams-list', { rows }, [
    { field: 'name', label: 'Sales team', link: true }, { field: 'lead_count', label: 'Total leads' },
    { field: 'member_count', label: 'Members' }, { field: 'open_count', label: 'Open pipeline' }, { field: 'quota', label: 'Quota', format: 'money' }, { field: 'expected_revenue', label: 'Expected revenue', format: 'money' },
  ]);
  list._onAction = async (_event: string, params: any) => renderTeamForm(params.id);
  list.mount(content);
}

async function renderCustomerForm(id?: string, fromHistory = false) {
  const route = { view: 'customer_form', id };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  const record = id ? await loadJson<any>(odata('customers', 'get', '', id), content) : { name: '', email: '', phone: '' };
  if (!record) return;
  clearContent(content);
  const form = new OdooFormView('crm-customer-form', { record }, [{ name: 'name', label: 'Customer', type: 'text' }, { name: 'email', label: 'Email', type: 'text' }, { name: 'phone', label: 'Phone', type: 'text' }]);
  const header = new OdooPageHeader('customer-form-header', { eyebrow: 'Sales', title: id ? record.name : 'New Customer', actions: [{ id: 'save', label: 'Save', variant: 'primary' }, { id: 'discard', label: 'Discard' }] });
  header._onAction = async (_event: string, params: any) => { if (params.id === 'discard') { dirtyGuard.reset(); return renderCustomers(); } if (params.id === 'save') return form.save(); };
  form._onAction = async (event: string, values: any) => { if (event === 'save') { if (id) values.id = id; await apiFetch(odata('customers', 'create'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }); dirtyGuard.reset(); return renderCustomers(); } };
  header.mount(content); form.mount(content); form.form?.addEventListener('input', () => dirtyGuard.markDirty()); form.form?.addEventListener('change', () => dirtyGuard.markDirty());
  if (id) {
    const related = await loadJson<any>(odata('customers', 'related', '', id), content);
    if (related) {
      const section = html.take(content).section.className('odoo-related-records').getContext();
      html.take(section).h2.text('Linked opportunities');
      const list = new OdooListView(`customer-related-${id}`, { rows: related.leads }, [{ field: 'name', label: 'Opportunity', link: true }, { field: 'stage_name', label: 'Stage' }, { field: 'expected_revenue', label: 'Revenue', format: 'money' }]);
      list._onAction = async (_event: string, params: any) => renderForm(params.id);
      list.mount(section);
      html.take(section).h2.text('Customer activities');
      const activities = new OdooListView(`customer-activities-${id}`, { rows: related.activities }, [{ field: 'summary', label: 'Activity' }, { field: 'activity_type', label: 'Type' }, { field: 'due_date', label: 'Due date' }, { field: 'done', label: 'Done' }]);
      activities._onAction = async (_event: string, params: any) => { const activity = related.activities.find((item: any) => item.id === params.id); if (activity?.lead_id) renderForm(activity.lead_id); };
      activities.mount(section);
      html.take(content).append(section);
    }
  }
}

async function renderTeamForm(id?: string, fromHistory = false) {
  const route = { view: 'team_form', id };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  const record = id ? await loadJson<any>(odata('teams', 'get', '', id), content) : { name: '', quota: 0, member_ids: '' };
  if (!record) return;
  clearContent(content);
  const form = new OdooFormView('crm-team-form', { record }, [{ name: 'name', label: 'Sales team', type: 'text' }, { name: 'quota', label: 'Monthly quota', type: 'number' }, { name: 'member_ids', label: 'Team members', type: 'select', multiple: true }]);
  const header = new OdooPageHeader('team-form-header', { eyebrow: 'Sales', title: id ? record.name : 'New Sales Team', actions: [{ id: 'save', label: 'Save', variant: 'primary' }, ...(id ? [{ id: 'pipeline', label: 'Open team pipeline' }] : []), { id: 'discard', label: 'Discard' }] });
  header._onAction = async (_event: string, params: any) => { if (params.id === 'discard') { dirtyGuard.reset(); return renderTeams(); } if (params.id === 'pipeline' && id) { dirtyGuard.reset(); return renderList('', 'Team Pipeline', 'list', { teamId: id }); } if (params.id === 'save') return form.save(); };
  form._onAction = async (event: string, values: any) => { if (event === 'save') { if (id) values.id = id; const response = await apiFetch(odata('teams', 'create'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) }); if (response.ok) { dirtyGuard.reset(); return renderTeams(); } notify('error', 'Manager permission is required to edit teams.'); } };
  header.mount(content); form.mount(content); form.form?.addEventListener('input', () => dirtyGuard.markDirty()); form.form?.addEventListener('change', () => dirtyGuard.markDirty());
  if (form.form) void loadTeamMembers(form.form, String(record.member_ids || ''));
}

async function renderActivities(search = '', query: { status?: string } = {}, activeView = 'list', fromHistory = false) {
  const route = { view: 'activities', search: search || undefined, status: query.status, activityView: activeView === 'list' ? undefined : activeView };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  let selectedIds: string[] = [];
  const header = new OdooPageHeader('activities-header', { eyebrow: 'Sales', title: menuLabel('activities'), actions: [{ id: 'new', label: 'New activity', variant: 'primary' }, { id: 'done', label: 'Mark done' }, { id: 'reopen', label: 'Reopen' }, { id: 'reschedule', label: 'Reschedule' }] });
  header._onAction = async (_event: string, params: any) => {
    if (params.id === 'new') {
      const leads = await (await apiFetch(odata('leads', 'list', 'type=opportunity'))).json();
      const values = await requestDialog({ title: 'Schedule activity', confirmLabel: 'Schedule', fields: [
        { name: 'lead_id', label: 'Opportunity', type: 'select', required: true, options: leads.map((lead: any) => ({ value: lead.id, label: lead.name })) },
        { name: 'activity_type', label: 'Type', type: 'select', value: 'To-do', required: true, options: ['To-do', 'Call', 'Email', 'Meeting'].map(value => ({ value, label: value })) },
        { name: 'summary', label: 'Summary', required: true },
        { name: 'due_date', label: 'Due date', type: 'date', value: new Date().toISOString().slice(0, 10), required: true },
      ] });
      if (values?.lead_id && values.summary) {
        await postExtra(String(values.lead_id), { kind: 'activity', activity_type: values.activity_type, summary: values.summary, due_date: values.due_date });
        await renderActivities(search, query, activeView);
      }
      return;
    }
    if (!selectedIds.length) return notify('info', 'Select one or more activities first.');
    const date = params.id === 'reschedule' ? await requestDialog({ title: 'Reschedule activities', confirmLabel: 'Reschedule', fields: [{ name: 'due_date', label: 'New due date', type: 'date', value: new Date().toISOString().slice(0, 10), required: true }] }) : {};
    if (params.id === 'reschedule' && !date) return;
    await apiFetch(odata('activities', 'mutate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: selectedIds, operation: params.id, value: date?.due_date || '' }) });
    await renderActivities(search, query, activeView);
  };
  header.mount(content);
  const control = new OdooControlPanel('activities-controls', { search }, { placeholder: 'Search activities…', views: action('crm.activities').views || ['list'], activeView, filterOptions: [{ value: 'all', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'done', label: 'Done' }, { value: 'overdue', label: 'Overdue' }], groupOptions: [], sortOptions: [], favoriteKey: 'core3:crm:activities:favorites' });
  control._onAction = async (event: string, params: any) => {
    if (event === 'search') return renderActivities(params.query || '', query, activeView);
    if (event === 'view') return renderActivities(search, query, params.view);
    if (event === 'control' && params.control === 'filter') return renderActivities(search, { status: params.value === 'all' ? undefined : params.value }, activeView);
  };
  control.mount(content);
  const rows = await loadJson<any[]>(odata('activities', 'list', `search=${encodeURIComponent(search)}&status=${encodeURIComponent(query.status || '')}`), content);
  if (!rows) return;
  if (activeView === 'calendar') {
    const calendar = new OdooCalendarView('crm-activities-calendar', { rows, titleField: 'summary', dateField: 'due_date', detailField: 'activity_type' });
    calendar._onAction = async (_event: string, params: any) => renderForm(rows.find(row => row.id === params.id)?.lead_id);
    calendar.mount(content);
  } else {
    const list = new OdooListView('crm-activities-list', { rows }, [
      { field: 'summary', label: 'Activity', link: true }, { field: 'activity_type', label: 'Type' },
      { field: 'lead_name', label: 'Related opportunity' }, { field: 'salesperson', label: 'Assigned to' },
      { field: 'due_date', label: 'Due date' }, { field: 'done', label: 'Status' },
    ], { selectable: true });
    list._onAction = async (event: string, params: any) => {
      if (event === 'selection') selectedIds = params.ids || [];
      if (event === 'open_record') return renderForm(rows.find(row => row.id === params.id)?.lead_id);
    };
    list.mount(content);
  }
}

function action(id: string): any { return actionService.resolve(id).action || { views: [], context: {} }; }
function menuLabel(id: string) { return (moduleDefinition.menus || []).find(item => item.id === `crm.${id}`)?.label || id; }
function iconFor(id: string) { return ({ 'crm.pipeline': 'activity', 'crm.leads': 'users', 'crm.activities': 'calendar', 'crm.reporting': 'analytics', 'crm.settings': 'settings' } as Record<string, string>)[id] || 'grid'; }

let filterOptions = [
  { value: 'all', label: 'All records' },
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
    return { name, label: definition.label, type: definition.type === 'monetary' || definition.type === 'number' || definition.type === 'integer' ? 'number' : definition.type === 'selection' || name === 'stage_id' ? 'select' : definition.type === 'date' ? 'date' : definition.type === 'html' ? 'textarea' : definition.type === 'boolean' ? 'checkbox' : 'text', options: options?.map((option: string) => ({ value: option, label: option[0].toUpperCase() + option.slice(1) })), list: definition.relation === 'res.partner' ? 'crm-partners' : definition.relation === 'res.users' ? 'crm-users' : definition.relation === 'crm.team' ? 'crm-teams' : definition.relation === 'crm.tag' ? 'crm-tags' : definition.relation === 'crm.recurring_plan' ? 'crm-recurring-plans' : undefined };
  });
}

async function loadJson<T>(url: string | URL, container: HTMLElement): Promise<T | null> {
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

function odata(entity: string, action: string, query = '', id?: string) {
  const endpoint = new URL('/api/crm', location.origin);
  endpoint.searchParams.set('entity', entity);
  endpoint.searchParams.set('action', action);
  if (id) endpoint.searchParams.set('id', id);
  new URLSearchParams(query).forEach((value, key) => endpoint.searchParams.set(key, value));
  return endpoint;
}

async function renderPipeline(search = '', query: ListQuery = {}, fromHistory = false) {
  const route = { view: 'pipeline', search: search || undefined, filter: query.filter, groupBy: query.groupBy, sort: query.sort };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('pipeline-header', { eyebrow: 'Sales', title: menuLabel('pipeline'), actions: [{ id: 'new', label: 'New', variant: 'primary' }, ...(canManage ? [{ id: 'import', label: 'Import' }] : [])] });
  header._onAction = async (_event: string, params: any) => params.id === 'new' ? renderForm() : runImport();
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
  const columns = await loadJson<any[]>(odata('pipeline', 'list', pipelineParams), content);
  if (!columns) return;
  const kanban = new OdooKanban('crm-pipeline', { columns, actions: canManage ? ['assign', 'won', 'lost', 'archive', 'delete'] : ['won', 'lost'] });
  kanban._onAction = async (action: string, params: any) => {
    if (action === 'stage_change') {
      await apiFetch(odata('leads', 'move-stage'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(params) });
      await renderPipeline(control.state.search || '');
    } else if (action === 'open_record') {
      void renderForm(params.id);
    } else if (action === 'quick_create') {
      const values = await requestDialog({ title: `New opportunity in ${params.stage_id}`, confirmLabel: 'Create opportunity', fields: [
        { name: 'name', label: 'Opportunity name', required: true },
        { name: 'expected_revenue', label: 'Expected revenue', type: 'number', value: 0 },
      ] });
      if (values?.name) {
        await apiFetch(odata('leads', 'create'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: String(values.name).trim(), expected_revenue: values.expected_revenue, stage_id: params.stage_id, type: 'opportunity' }) });
        await renderPipeline(control.state.search || '');
      }
    } else if (action === 'record_action') {
      const operation = params.action === 'won' || params.action === 'lost' ? 'stage' : params.action;
      const assignment = params.action === 'assign' ? await requestDialog({ title: 'Assign opportunity', confirmLabel: 'Assign', fields: [{ name: 'salesperson', label: 'Salesperson', required: true }] }) : null;
      if (params.action === 'assign' && !assignment) return;
      const confirmation = params.action === 'delete' ? await requestDialog({ title: 'Delete opportunity', message: 'This action cannot be undone.', confirmLabel: 'Delete' }) : {};
      const value = params.action === 'won' || params.action === 'lost' ? params.action : String(assignment?.salesperson || '');
      if (params.action !== 'delete' || confirmation) {
      await apiFetch(odata('leads', 'mutate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [params.id], operation, value }) });
        await renderPipeline(control.state.search || '');
      }
    }
  };
  kanban.mount(content);
}

async function renderList(search = '', title = menuLabel('leads'), activeView = 'list', query: ListQuery = {}, fromHistory = false) {
  const route = { view: 'list', search: search || undefined, filter: query.filter, groupBy: query.groupBy, sort: query.sort, teamId: query.teamId };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  let loadedRows: any[] = [];
  const header = new OdooPageHeader('list-header', { eyebrow: 'Sales', title, actions: [{ id: 'new', label: 'New', variant: 'primary' }, { id: 'export', label: 'Export' }] });
  header._onAction = async (_action: string, params: any) => params.id === 'export' ? downloadCsv(loadedRows) : renderForm();
  header.mount(content);
  const actionId = title === menuLabel('pipeline') || title === 'Team Pipeline' ? 'crm.pipeline' : 'crm.leads';
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
  const params = new URLSearchParams({ search, type, filter: query.filter || 'all', sort: query.sort || 'recent', group_by: query.groupBy || '', team_id: query.teamId || '' });
  const rows = await loadJson<any[]>(odata('leads', 'list', params), content);
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
      const operations = query.filter === 'archived' ? ['restore', ...(canManage ? ['delete'] : [])] : canManage ? ['archive', 'delete', 'assign', 'stage', 'merge'] : ['stage'];
      const selected = await requestDialog({ title: `Bulk action (${params.ids.length} records)`, confirmLabel: 'Continue', fields: [{ name: 'operation', label: 'Operation', type: 'select', required: true, value: operations[0], options: operations.map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) }] });
      const operation = String(selected?.operation || '');
      if (operations.includes(operation)) {
        const mergeSummary = operation === 'merge' ? await (await apiFetch(odata('leads', 'merge-preview'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: params.ids }) })).json() : null;
        const valueDialog = operation === 'assign' ? await requestDialog({ title: 'Assign records', confirmLabel: 'Assign', fields: [{ name: 'value', label: 'Salesperson', required: true }] }) : operation === 'stage' ? await requestDialog({ title: 'Move records', confirmLabel: 'Move', fields: [{ name: 'value', label: 'Stage', type: 'select', value: 'qualified', required: true, options: ['new', 'qualified', 'proposition', 'won', 'lost'].map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) })) }] }) : operation === 'delete' ? await requestDialog({ title: 'Delete selected records', message: 'This action cannot be undone.', confirmLabel: 'Delete' }) : operation === 'merge' ? await requestDialog({ title: 'Merge records', message: `Keep “${mergeSummary.primary?.name || 'the first record'}” and merge ${mergeSummary.duplicates?.map((row: any) => row.name).join(', ') || 'the other records'} into it?`, confirmLabel: 'Merge records' }) : {};
        if ((operation === 'assign' || operation === 'stage') && !valueDialog) return;
        if (operation === 'delete' && !valueDialog) return;
        const value = String(valueDialog?.value || '');
        await apiFetch(odata('leads', 'mutate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: params.ids, operation, value }) });
        void renderList(search, title, activeView, query);
      }
    }
  };
  list.mount(content);
}

function downloadCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return notify('info', 'There are no records to export.');
  const columns = rows[0].label != null ? Object.keys(rows[0]) : ['name', 'type', 'partner_name', 'salesperson', 'stage_name', 'expected_revenue', 'priority'];
  const csv = [columns.join(','), ...rows.map(row => columns.map(column => JSON.stringify(String(row[column] ?? ''))).join(','))].join('\n');
  const link = html.create('a').attr('href', URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))).attr('download', 'crm-records.csv').getContext();
  html.take(document.body).append(link);
  link.click();
  link.remove();
}

async function renderAnalyticsView(view: 'calendar' | 'graph' | 'pivot', search = '', fromHistory = false, query: ListQuery = {}) {
  const route = { view, search: search || undefined, filter: query.filter, groupBy: query.groupBy, sort: query.sort };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('analytics-header', { eyebrow: 'Sales', title: view[0].toUpperCase() + view.slice(1), actions: [{ id: 'new', label: 'New', variant: 'primary' }] });
  header._onAction = async () => renderForm();
  header.mount(content);
  const control = new OdooControlPanel('analytics-controls', { search }, { placeholder: 'Search opportunities…', views: action('crm.pipeline').views || [], activeView: view, filterOptions, groupOptions, sortOptions, favoriteKey: 'core3:crm:pipeline:favorites' });
  control._onAction = async (event: string, params: any) => {
    if (event === 'search') void renderAnalyticsView(view, params.query || '', false, { ...query, search: params.query || '' });
    else if (event === 'view' && params.view === 'kanban') void renderPipeline(params.search || '');
    else if (event === 'view' && params.view === 'list') void renderList(params.search || '', menuLabel('pipeline'), 'list');
    else if (event === 'view' && ['calendar', 'graph', 'pivot'].includes(params.view)) void renderAnalyticsView(params.view, params.search || '', false, query);
    else if (event === 'control') {
      const next = { ...query, search: control.state.search || search };
      if (params.control === 'filter') next.filter = params.value;
      if (params.control === 'group') next.groupBy = params.value;
      if (params.control === 'sort') next.sort = params.value;
      if (params.control === 'favorite_saved') notify('success', 'Favorite filter saved.');
      if (params.control === 'favorite_apply') Object.assign(next, params.favorite || {});
      if (['filter', 'group', 'sort', 'favorite_apply'].includes(params.control)) void renderAnalyticsView(view, next.search || '', false, next);
    }
  };
  control.mount(content);
  const params = new URLSearchParams({ search, type: 'opportunity', filter: query.filter || 'all', sort: query.sort || 'recent', group_by: query.groupBy || '' });
  const rows = await loadJson<any[]>(odata('leads', 'list', params), content);
  if (!rows) return;
  if (view === 'graph') {
    const graph = new OdooGraphView('crm-graph', { rows, labelField: 'stage_name', valueField: 'expected_revenue' });
    graph._onAction = async (_event: string, params: any) => renderReportDrilldown('stage', params.label);
    graph.mount(content);
  } else if (view === 'pivot') {
    const pivot = new OdooPivotView('crm-pivot', { rows, rowField: 'salesperson', columnField: 'stage_name', measureField: 'expected_revenue' });
    pivot._onAction = async (_event: string, params: any) => renderReportDrilldown('salesperson', params.row, false, params.column ? 'stage' : '', params.column || '');
    pivot.mount(content);
  } else {
    const calendar = new OdooCalendarView('crm-calendar', { rows, titleField: 'name', dateField: 'expected_closing', detailField: 'next_activity' });
    calendar.mount(content);
  }
}

async function renderReportDrilldown(dimension: string, value: string, fromHistory = false, secondaryDimension = '', secondaryValue = '') {
  const route = { view: 'report_drilldown', dimension, value, secondaryDimension: secondaryDimension || undefined, secondaryValue: secondaryValue || undefined };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('report-drilldown-header', { eyebrow: 'Reporting', title: `${value}${secondaryValue ? ` / ${secondaryValue}` : ''} opportunities`, actions: [{ id: 'back', label: 'Back to report' }] });
  header._onAction = async () => renderReporting();
  header.mount(content);
  const drilldownParams = new URLSearchParams({ dimension, value });
  if (secondaryDimension) { drilldownParams.set('secondary_dimension', secondaryDimension); drilldownParams.set('secondary_value', secondaryValue); }
  const rows = await loadJson<any[]>(odata('report', 'drilldown', drilldownParams), content);
  if (!rows) return;
  const list = new OdooListView('report-drilldown-list', { rows }, [
    { field: 'name', label: 'Opportunity', link: true }, { field: 'stage_name', label: 'Stage' },
    { field: 'partner_name', label: 'Customer' }, { field: 'expected_revenue', label: 'Revenue', format: 'money' },
  ]);
  list._onAction = async (_event: string, params: any) => renderForm(params.id);
  list.mount(content);
}

async function renderActivityDrilldown(dimension: string, value: string, fromHistory = false) {
  const route = { view: 'activity_drilldown', dimension, value };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('activity-drilldown-header', { eyebrow: 'Reporting', title: `${value} activities`, actions: [{ id: 'back', label: 'Back to analysis' }] });
  header._onAction = async () => renderActivityAnalysis(dimension);
  header.mount(content);
  const rows = await loadJson<any[]>(odata('report', 'activity-drilldown', `dimension=${encodeURIComponent(dimension)}&value=${encodeURIComponent(value)}`), content);
  if (!rows) return;
  const list = new OdooListView('activity-drilldown-list', { rows }, [
    { field: 'summary', label: 'Activity' }, { field: 'lead_name', label: 'Opportunity', link: true },
    { field: 'due_date', label: 'Due date' }, { field: 'done', label: 'Done' },
  ]);
  list._onAction = async (_event: string, params: any) => {
    const activity = rows.find(row => row.id === params.id);
    if (activity?.lead_id) await renderForm(activity.lead_id);
  };
  list.mount(content);
}

async function renderLeadDrilldown(dimension: string, value: string, fromHistory = false) {
  const route = { view: 'lead_drilldown', dimension, value };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement;
  if (!content) return;
  clearContent(content);
  const header = new OdooPageHeader('lead-drilldown-header', { eyebrow: 'Reporting', title: `${value} leads`, actions: [{ id: 'back', label: 'Back to leads analysis' }] });
  header._onAction = async () => renderLeadAnalysis(dimension);
  header.mount(content);
  const rows = await loadJson<any[]>(odata('report', 'lead-drilldown', `dimension=${encodeURIComponent(dimension)}&value=${encodeURIComponent(value)}`), content);
  if (!rows) return;
  const list = new OdooListView('lead-drilldown-list', { rows }, [{ field: 'name', label: 'Lead / opportunity', link: true }, { field: 'type', label: 'Type' }, { field: 'stage_name', label: 'Stage' }, { field: 'source', label: 'Source' }]);
  list._onAction = async (_event: string, params: any) => renderForm(params.id);
  list.mount(content);
}

async function renderForm(id?: string, fromHistory = false) {
  const route = { view: 'form', id };
  if (fromHistory) router.replace(route); else router.push(route);
  const content = shell.contentElement; if (!content) return;
  window.onbeforeunload = null;
  const record = id ? await loadJson<any>(odata('leads', 'get', '', id), content) : { type: 'opportunity', stage_id: 'new', priority: 0 };
  if (!record) return;
  const extras = id ? await loadJson<any>(odata('leads', 'extras', '', id), content) : { messages: [], activities: [], followers: [], attachments: [] };
  if (!extras) return;
  const formView = new OdooFormView('crm-lead-form', { record }, formFields());
  formView._onAction = async (event: string, values: any) => { if (event === 'save') await saveForm(values, id); };
  clearContent(content);
  const header = new OdooPageHeader('form-header', { eyebrow: record.type === 'lead' ? 'Lead' : 'Opportunity', title: id ? record.name || 'Opportunity' : 'New Opportunity', actions: [
    { id: 'save', label: 'Save', variant: 'primary' }, { id: 'discard', label: 'Discard' },
    ...(id && record.type === 'lead' ? [{ id: 'convert', label: 'Convert to opportunity' }] : []),
    ...(id && record.stage_id !== 'won' && record.stage_id !== 'lost' ? [{ id: 'lost', label: 'Mark lost' }] : []),
    ...(id ? [{ id: 'duplicates', label: 'Check duplicates' }] : []),
    ...(id ? [{ id: 'duplicate', label: 'Duplicate' }, ...(canManage ? [{ id: 'archive', label: 'Archive' }, { id: 'delete', label: 'Delete' }] : [])] : []),
  ] });
  header._onAction = async (_event: string, params: any) => {
    if (params.id === 'save') return formView.save();
    if (params.id === 'discard') { dirtyGuard.reset(); return renderPipeline(); }
    if (!id) return;
    if (params.id === 'convert') {
      const conversion = await requestDialog({ title: 'Convert lead to opportunity', message: 'Optionally link the opportunity to an existing or new customer by name.', confirmLabel: 'Convert', fields: [{ name: 'customer_name', label: 'Customer name', value: record.partner_name || '' }] });
      if (!conversion) return;
      await apiFetch(odata('leads', 'convert', '', id), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer_name: String(conversion.customer_name || '') }) });
      return renderForm(id);
    }
    if (params.id === 'lost') {
      const reasons = await (await apiFetch(odata('lost-reasons', 'list'))).json();
      const reasonValues = await requestDialog({ title: 'Mark record lost', confirmLabel: 'Mark lost', fields: [{ name: 'reason_id', label: 'Lost reason', type: 'select', required: true, value: reasons[0]?.id || '', options: reasons.map((item: any) => ({ value: item.id, label: item.name })) }] });
      if (reasonValues?.reason_id) {
        await apiFetch(odata('leads', 'lost', '', id), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason_id: reasonValues.reason_id }) });
        return renderForm(id);
      }
      return;
    }
    if (params.id === 'duplicates') {
      const duplicates = await (await apiFetch(odata('leads', 'duplicates', '', id))).json();
      return notify(duplicates.length ? 'warning' : 'info', duplicates.length ? `Possible duplicates: ${duplicates.map((item: any) => item.name).join(', ')}` : 'No possible duplicates found.');
    }
    if (params.id === 'duplicate') return renderForm();
    const confirmation = await requestDialog({ title: `${params.id[0].toUpperCase() + params.id.slice(1)} record`, message: `Are you sure you want to ${params.id} this record?`, confirmLabel: params.id[0].toUpperCase() + params.id.slice(1) });
    if (confirmation) {
      await apiFetch(odata('leads', 'mutate'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id], operation: params.id }) });
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
    await apiFetch(odata('leads', 'move-stage'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stage_id: params.value }) });
    await renderForm(id);
  };
  statusbar.mount(formContainer);
  html.take(formContainer).append(stats);
  formView.mount(formContainer);
  if (formView.form && id) {
    const version = document.createElement('input');
    version.type = 'hidden';
    version.name = 'write_version';
    version.value = String(record.write_version || 1);
    formView.form.append(version);
  }
  chatter.mount(chatterContainer);
  if (formView.form) void loadPartners(formView.form);
  html.take(content).div.className('odoo-form-layout').append(formContainer).append(chatterContainer).getContext();
  const initialFormValues = JSON.stringify([...new FormData(formView.form).entries()]);
  window.onbeforeunload = () => formView.form && JSON.stringify([...new FormData(formView.form).entries()]) !== initialFormValues ? 'Unsaved changes' : undefined;
  formView.form?.addEventListener('input', () => dirtyGuard.markDirty());
  formView.form?.addEventListener('change', () => dirtyGuard.markDirty());
}

async function saveForm(values: Record<string, FormDataEntryValue>, id?: string) {
  if (id) values.id = id;
  const response = await apiFetch(odata('leads', 'create'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return notify('error', error.error || 'Unable to save record.');
  }
  dirtyGuard.reset();
  shell.setActiveNav('pipeline'); await renderPipeline();
}

function renderChatter(id: string | undefined, extras: any) {
  const chatter = new OdooChatter('record-chatter', extras);
  chatter._onAction = async (event: string, params: any) => {
    if (!id || !String(params.body || params.summary || params.name || '').trim()) return;
    if (event === 'message') await postExtra(id, { kind: 'message', body: params.body });
    if (event === 'activity') await postExtra(id, { kind: 'activity', activity_type: 'To-do', summary: params.summary, due_date: new Date().toISOString().slice(0, 10) });
    if (event === 'follower') await postExtra(id, { kind: 'follower', name: params.name });
    if (event === 'attachment') {
      if (params.file instanceof File) await uploadAttachment(id, params.file);
      else await postExtra(id, { kind: 'attachment', name: params.name });
    }
    await renderForm(id);
  };
  return chatter;
}

async function postExtra(id: string, body: Record<string, unknown>) {
  await apiFetch(odata('leads', 'extras', '', id), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

async function uploadAttachment(id: string, file: File) {
  const body = new FormData();
  body.append('file', file, file.name);
  await apiFetch(odata('leads', 'extras', '', id), { method: 'POST', body });
}

async function loadPartners(form: HTMLFormElement) {
  const lookups = await (await apiFetch(odata('lookups', 'list'))).json();
  for (const [fieldName, rows] of [['partner_id', lookups.partners], ['salesperson_id', lookups.users], ['team_id', lookups.teams], ['recurring_plan_id', lookups.recurringPlans]] as [string, any[]][]) {
    const input = form.elements.namedItem(fieldName);
    if (!(input instanceof HTMLInputElement)) continue;
    const select = document.createElement('select');
    select.name = fieldName;
    select.className = input.className;
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '— Select —';
    select.append(empty);
    for (const row of rows) {
      const option = document.createElement('option');
      option.value = row.id;
      option.textContent = row.name;
      select.append(option);
    }
    select.value = input.value;
    input.replaceWith(select);
  }
  for (const [id, rows] of [['crm-partners', lookups.partners], ['crm-users', lookups.users], ['crm-teams', lookups.teams], ['crm-tags', lookups.tags]] as [string, any[]][]) {
    const datalist = html.create('datalist').id(id).getContext();
    for (const row of rows) html.take(datalist).option.attr('value', row.name);
    html.take(form).append(datalist);
  }
}

async function loadTeamMembers(form: HTMLFormElement, selectedIds: string) {
  const input = form.elements.namedItem('member_ids');
  if (!(input instanceof HTMLSelectElement)) return;
  const lookups = await (await apiFetch(odata('lookups', 'list'))).json();
  for (const user of lookups.users || []) {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = user.name;
    option.selected = selectedIds.split(',').includes(user.id);
    input.append(option);
  }
}

function clearContent(content: HTMLElement) { window.onbeforeunload = null; lastRenderedRoute = router.read(); html.take(content).clear(); }
