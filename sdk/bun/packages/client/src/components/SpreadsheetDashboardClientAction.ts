import { BaseComponent } from '@core3/client/components/BaseComponent';
import { pushParams } from '@core3/client/navigate';
import { SpreadsheetAdapter } from '../adapters/SpreadsheetAdapter';
import { workbookRequest } from '../spreadsheet/WorkbookTransport';
import { WorkbookLiveData } from '../spreadsheet/live-data';
import { openWorkbookFilters } from '../spreadsheet/global-filters';

type DashboardRow = {
  id: string;
  group_id?: string;
  group_name?: string;
  name: string;
  favorite?: boolean;
  snapshot_status?: string;
};

function sourceRows(dataMap: Record<string, any>, sourceId?: string): any[] {
  const value = sourceId ? dataMap[sourceId]?.data : [];
  return Array.isArray(value) ? value : value && typeof value === 'object' ? [value] : [];
}

function text(value: unknown, fallback = '') {
  return String(value ?? fallback);
}

/** Dashboard navigation around the persisted workbook's actual engine surface. */
export class SpreadsheetDashboardClientAction extends BaseComponent {
  model: any = null;
  private liveData?: WorkbookLiveData;
  private pending = new AbortController();
  private generation = 0;

  override dispose() {
    this.generation++;
    this.pending.abort();
    this.liveData?.dispose();
    super.dispose();
  }

  static resolveState(definition: any, context: any) {
    return {
      ...definition,
      dataMap: context.dataMap || {},
      pageParams: context.state || {},
      activeDashboardId: context.state?.dashboard_id || definition.default_dashboard_id || null,
      granularity: context.state?.granularity || 'days',
    };
  }

  draw(container: HTMLElement) {
    const generation = ++this.generation;
    this.pending.abort(); this.pending = new AbortController();
    this.liveData?.dispose(); this.liveData = undefined;
    const dataMap = this.state.dataMap || {};
    const groups = sourceRows(dataMap, this.state.groups_source);
    const dashboards = sourceRows(dataMap, this.state.dashboards_source) as DashboardRow[];
    const workbooks = sourceRows(dataMap, this.state.workbooks_source);
    const activeId = text(this.state.activeDashboardId);
    const active = activeId
      ? dashboards.find(dashboard => text(dashboard.id) === activeId)
      : dashboards[0];
    this.model = null;
    this.disposeAdapters();

    container.replaceChildren();
    const root = document.createElement('section');
    root.className = 'o-spreadsheet-dashboard-action';
    root.setAttribute('aria-label', 'Dashboards');
    container.append(root);

    const header = document.createElement('header');
    header.className = 'o-spreadsheet-dashboard-toolbar';
    root.append(header);
    const heading = document.createElement('div');
    heading.className = 'o-spreadsheet-dashboard-heading';
    heading.innerHTML = '<h1>Dashboards</h1><span class="o-spreadsheet-readonly">Read-only</span>';
    header.append(heading);
    const controls = document.createElement('div');
    controls.className = 'o-spreadsheet-dashboard-controls';
    header.append(controls);
    const favorite = document.createElement('button');
    favorite.type = 'button';
    favorite.className = 'o-spreadsheet-dashboard-favorite';
    favorite.textContent = active?.favorite ? '★' : '☆';
    favorite.setAttribute('aria-label', active?.favorite ? 'Favorite dashboard' : 'Add dashboard to favorites');
    favorite.title = active?.favorite ? 'Remove from favorites' : 'Add to favorites';
    favorite.addEventListener('click', () => {
      if (!this.state.favorite_action || !active) return;
      void this.submit(this.state.favorite_action, { state: { dashboard_id: active.id }, row: active });
    });
    controls.append(favorite);

    if (!active) {
      this.renderState(root, activeId ? 'missing' : 'empty', activeId ? 'Dashboard not found' : 'No available dashboard', activeId ? 'The selected dashboard is unavailable or has been unpublished.' : 'There are no published dashboards available for your account.');
      return;
    }

    const shell = document.createElement('div');
    shell.className = 'o-spreadsheet-dashboard-shell';
    root.append(shell);
    const mobilePicker = document.createElement('details');
    mobilePicker.className = 'o-spreadsheet-dashboard-mobile-picker';
    const pickerSummary = document.createElement('summary');
    pickerSummary.textContent = `${active.group_name || 'Dashboards'} / ${active.name}`;
    mobilePicker.append(pickerSummary);
    this.renderDashboardButtons(mobilePicker, groups, dashboards, active);
    shell.append(mobilePicker);

    const sidebar = document.createElement('aside');
    sidebar.className = 'o-spreadsheet-dashboard-sidebar';
    sidebar.innerHTML = '<div class="o-spreadsheet-dashboard-sidebar-title">Dashboards</div>';
    this.renderDashboardButtons(sidebar, groups, dashboards, active);
    shell.append(sidebar);

    const content = document.createElement('main');
    content.className = 'o-spreadsheet-dashboard-content';
    shell.append(content);
    const canvasHeading = document.createElement('div');
    canvasHeading.className = 'o-spreadsheet-dashboard-canvas-heading';
    const groupLabel = document.createElement('span');
    groupLabel.className = 'o-spreadsheet-dashboard-group';
    groupLabel.textContent = active.group_name || 'Dashboards';
    const title = document.createElement('h2');
    title.textContent = active.name;
    const headingText = document.createElement('div');
    headingText.append(groupLabel, title);
    canvasHeading.append(headingText);
    content.append(canvasHeading);

    const workbook = workbooks.find(row => text(row.id) === text(active.id));
    const status = text(workbook?.snapshot_status || active.snapshot_status || 'missing');
    if (this.state.pageParams?.fixture_state === 'error' || status === 'error') {
      this.renderState(content, 'error', 'Unable to load dashboard', 'The workbook source returned an unreadable snapshot.');
      return;
    }
    if (status === 'empty') {
      this.renderState(content, 'empty', 'Empty workbook', 'This dashboard has no readable spreadsheet data.');
      return;
    }
    if (!workbook) {
      this.renderState(content, 'missing', 'Dashboard not found', 'The selected dashboard is unavailable or has been unpublished.');
      return;
    }

    const engineStatus = document.createElement('p');
    engineStatus.setAttribute('role', 'status');
    engineStatus.textContent = 'Loading dashboard…';
    const canvas = document.createElement('div');
    canvas.className = 'o-spreadsheet-dashboard-engine';
    canvas.style.cssText = 'height:75vh;min-height:420px;min-width:0;position:relative;overflow:hidden';
    content.append(engineStatus, canvas);
    const mount = (data: any, revisions?: any[]) => this.mountAdapter('dashboard', new SpreadsheetAdapter(), canvas, {
      data, revisions, mode: 'dashboard',
      config: this.liveData ? { custom: { core3Data: this.liveData } } : undefined,
      onReady: model => { this.model = model; this.liveData?.attach(model); engineStatus.textContent = 'View only'; },
      onError: error => { engineStatus.textContent = error.message; },
    });
    if (workbook.workbook_id) {
      const refresh = document.createElement('button');
      refresh.type = 'button'; refresh.textContent = 'Refresh dashboard';
      refresh.addEventListener('click', () => this.redraw());
      controls.prepend(refresh);
      if (!this.state.workbook_endpoint) { engineStatus.textContent = 'Workbook service unavailable'; return; }
      const request = workbookRequest(`${this.state.workbook_endpoint}/${encodeURIComponent(workbook.workbook_id)}`);
      void request('', { signal: this.pending.signal }).then(book => {
        if (generation !== this.generation) return;
        if (book.archived) throw new Error('Dashboard workbook is archived');
        if (this.state.workbook_route) {
          const open = document.createElement('a');
          open.textContent = 'Open workbook';
          const target = new URL(this.state.workbook_route, window.location.origin);
          target.searchParams.set('workbook_id', workbook.workbook_id);
          open.href = target.pathname + target.search;
          controls.append(open);
        }
        this.liveData = new WorkbookLiveData(request);
        const filters = document.createElement('button');
        filters.type = 'button'; filters.textContent = 'Global filters';
        filters.addEventListener('click', () => { void openWorkbookFilters(container, request, () => this.redraw()).catch(error => { engineStatus.textContent = error.message; }); });
        controls.append(filters);
        mount(book.snapshot, book.revisions);
      }).catch(error => { if (generation === this.generation) engineStatus.textContent = error.message; });
    } else mount(workbook.workbook_snapshot);
  }

  private renderDashboardButtons(target: HTMLElement, groups: any[], dashboards: DashboardRow[], active: DashboardRow) {
    for (const group of groups) {
      const groupDashboards = dashboards.filter(dashboard => text(dashboard.group_id) === text(group.id));
      if (!groupDashboards.length) continue;
      const section = document.createElement('section');
      section.className = 'o-spreadsheet-dashboard-group-section';
      const title = document.createElement('h3');
      title.textContent = text(group.name);
      section.append(title);
      for (const dashboard of groupDashboards) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = text(dashboard.id) === text(active.id) ? 'is-active' : '';
        button.textContent = text(dashboard.name);
        button.title = text(dashboard.name);
        button.addEventListener('click', () => {
          pushParams({ dashboard_id: dashboard.id });
          this.state.activeDashboardId = dashboard.id;
          this.redraw();
        });
        section.append(button);
      }
      target.append(section);
    }
  }

  private renderState(target: HTMLElement, state: string, title: string, description: string) {
    const stateEl = document.createElement('div');
    stateEl.className = `o-spreadsheet-dashboard-state is-${state}`;
    stateEl.innerHTML = `<strong>${title}</strong><span>${description}</span>`;
    target.append(stateEl);
  }

}
