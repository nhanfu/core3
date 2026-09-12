import { BaseComponent } from '@core3/client/components/BaseComponent';
import { pushParams } from '@core3/client/navigate';

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
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = '') {
  return String(value ?? fallback);
}

function money(value: unknown) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);
}

/** Read-only approximation of Odoo's action_spreadsheet_dashboard client action. */
export class SpreadsheetDashboardClientAction extends BaseComponent {
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
    const dataMap = this.state.dataMap || {};
    const groups = sourceRows(dataMap, this.state.groups_source);
    const dashboards = sourceRows(dataMap, this.state.dashboards_source) as DashboardRow[];
    const workbooks = sourceRows(dataMap, this.state.workbooks_source);
    const summaries = sourceRows(dataMap, this.state.summaries_source);
    const chartPoints = sourceRows(dataMap, this.state.chart_source);
    const rows = sourceRows(dataMap, this.state.rows_source);
    const activeId = text(this.state.activeDashboardId);
    const active = activeId
      ? dashboards.find(dashboard => text(dashboard.id) === activeId)
      : dashboards[0];

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
    const date = document.createElement('button');
    date.type = 'button';
    date.className = 'o-spreadsheet-dashboard-date';
    date.textContent = text(this.state.pageParams?.dashboard_date, '2026-01-15');
    date.title = 'Dashboard date';
    controls.append(date);
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'o-spreadsheet-dashboard-share';
    share.textContent = 'Share';
    share.disabled = true;
    share.title = 'Sharing is available from the dashboard access batch';
    controls.append(share);
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
    canvasHeading.innerHTML = `<div><span class="o-spreadsheet-dashboard-group">${active.group_name || 'Dashboards'}</span><h2>${active.name}</h2></div>`;
    const granularity = document.createElement('div');
    granularity.className = 'o-spreadsheet-granularity';
    for (const option of ['days', 'weeks', 'months', 'quarters']) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = option[0].toUpperCase() + option.slice(1);
      button.className = option === this.state.granularity ? 'is-active' : '';
      button.addEventListener('click', () => {
        this.state.granularity = option;
        this.redraw();
      });
      granularity.append(button);
    }
    canvasHeading.append(granularity);
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

    const snapshot = this.parseSnapshot(workbook.workbook_snapshot);
    this.renderWorkbook(content, snapshot, summaries.find(row => text(row.dashboard_id) === text(active.id)), chartPoints.filter(row => text(row.dashboard_id) === text(active.id)), rows.filter(row => text(row.dashboard_id) === text(active.id)));
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

  private renderWorkbook(container: HTMLElement, snapshot: any, summary: any, chartPoints: any[], rows: any[]) {
    const workbook = document.createElement('div');
    workbook.className = 'o-spreadsheet-workbook';
    const sheetbar = document.createElement('div');
    sheetbar.className = 'o-spreadsheet-sheetbar';
    sheetbar.innerHTML = `<span class="o-spreadsheet-sheet-icon">▦</span><span>Sheet1</span><span class="o-spreadsheet-sheet-state">View only</span>`;
    workbook.append(sheetbar);
    const formula = document.createElement('div');
    formula.className = 'o-spreadsheet-formula-bar';
    formula.innerHTML = '<span class="o-spreadsheet-name-box">B2</span><span class="o-spreadsheet-formula">=SUM(B5:B7)</span>';
    workbook.append(formula);
    const figures = document.createElement('div');
    figures.className = 'o-spreadsheet-figures';
    this.renderKpis(figures, summary);
    this.renderChart(figures, chartPoints);
    this.renderTable(figures, rows);
    this.renderMap(figures, rows);
    this.renderTreemap(figures, rows);
    workbook.append(figures);
    const grid = document.createElement('div');
    grid.className = 'o-spreadsheet-grid';
    grid.setAttribute('role', 'grid');
    const cells = snapshot?.sheets?.[0]?.cells || { A1: 'Sales dashboard', B2: '=SUM(B5:B7)' };
    const rowsToRender = [['', 'A', 'B', 'C', 'D'], ['1', text(cells.A1, 'Sales dashboard'), '', '', ''], ['2', '', text(cells.B2, '=SUM(B5:B7)'), '', ''], ['3', '', '2026-01-15', 'Published', 'Read-only']];
    for (const values of rowsToRender) {
      const row = document.createElement('div');
      row.className = 'o-spreadsheet-grid-row';
      for (const value of values) {
        const cell = document.createElement('span');
        cell.className = 'o-spreadsheet-grid-cell';
        cell.textContent = value;
        row.append(cell);
      }
      grid.append(row);
    }
    workbook.append(grid);
    container.append(workbook);
  }

  private renderKpis(target: HTMLElement, summary: any) {
    const card = document.createElement('section');
    card.className = 'o-spreadsheet-figure o-spreadsheet-kpi-figure';
    card.innerHTML = '<h3>Overview</h3>';
    const grid = document.createElement('div');
    grid.className = 'o-spreadsheet-kpis';
    for (const item of [{ label: 'Revenue', value: money(summary?.revenue) }, { label: 'Orders', value: text(summary?.orders, '0') }, { label: 'Customers', value: text(summary?.customers, '0') }]) {
      const kpi = document.createElement('div');
      kpi.className = 'o-spreadsheet-kpi';
      kpi.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
      grid.append(kpi);
    }
    card.append(grid);
    target.append(card);
  }

  private renderChart(target: HTMLElement, points: any[]) {
    const figure = document.createElement('section');
    figure.className = 'o-spreadsheet-figure o-spreadsheet-chart-figure';
    figure.innerHTML = '<h3>Revenue over time</h3><div class="o-spreadsheet-chart" role="img" aria-label="Revenue over time"></div>';
    const chart = figure.querySelector('.o-spreadsheet-chart') as HTMLElement;
    const max = Math.max(...points.map(point => Number(point.revenue) || 0), 1);
    for (const point of points) {
      const bar = document.createElement('span');
      bar.title = `${point.period}: ${money(point.revenue)}`;
      bar.style.height = `${Math.max(8, ((Number(point.revenue) || 0) / max) * 100)}%`;
      bar.dataset.period = text(point.period);
      chart.append(bar);
    }
    target.append(figure);
  }

  private renderTable(target: HTMLElement, rows: any[]) {
    const figure = document.createElement('section');
    figure.className = 'o-spreadsheet-figure o-spreadsheet-table-figure';
    figure.innerHTML = '<h3>Top categories</h3>';
    const table = document.createElement('table');
    table.innerHTML = '<thead><tr><th>Country</th><th>Category</th><th>Revenue</th><th>Orders</th></tr></thead>';
    const body = document.createElement('tbody');
    for (const row of rows.slice(0, 5)) {
      const tr = document.createElement('tr');
      for (const value of [row.country, row.category, money(row.revenue), row.orders]) {
        const td = document.createElement('td');
        td.textContent = text(value);
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
    figure.append(table);
    target.append(figure);
  }

  private renderMap(target: HTMLElement, rows: any[]) {
    const figure = document.createElement('section');
    figure.className = 'o-spreadsheet-figure o-spreadsheet-map-figure';
    figure.innerHTML = '<h3>Top countries</h3><div class="o-spreadsheet-map" role="img" aria-label="Top countries map"></div>';
    const map = figure.querySelector('.o-spreadsheet-map') as HTMLElement;
    rows.slice(0, 5).forEach((row, index) => {
      const marker = document.createElement('span');
      marker.className = 'o-spreadsheet-map-marker';
      marker.textContent = String(index + 1);
      marker.style.left = `${18 + index * 17}%`;
      marker.style.top = `${30 + (index % 2) * 24}%`;
      marker.title = text(row.country);
      map.append(marker);
    });
    target.append(figure);
  }

  private renderTreemap(target: HTMLElement, rows: any[]) {
    const figure = document.createElement('section');
    figure.className = 'o-spreadsheet-figure o-spreadsheet-treemap-figure';
    figure.innerHTML = '<h3>Top categories</h3><div class="o-spreadsheet-treemap" role="img" aria-label="Top categories treemap"></div>';
    const tree = figure.querySelector('.o-spreadsheet-treemap') as HTMLElement;
    rows.slice(0, 5).forEach((row, index) => {
      const tile = document.createElement('span');
      tile.textContent = text(row.category);
      tile.title = `${row.category}: ${money(row.revenue)}`;
      tile.style.flex = `${Math.max(1, Number(row.revenue) || 1)} 1 0`;
      tile.className = `o-spreadsheet-tile is-${index % 4}`;
      tree.append(tile);
    });
    target.append(figure);
  }

  private renderState(target: HTMLElement, state: string, title: string, description: string) {
    const stateEl = document.createElement('div');
    stateEl.className = `o-spreadsheet-dashboard-state is-${state}`;
    stateEl.innerHTML = `<strong>${title}</strong><span>${description}</span>`;
    target.append(stateEl);
  }

  private parseSnapshot(value: unknown) {
    if (typeof value === 'object' && value) return value;
    try {
      return JSON.parse(text(value, '{}'));
    } catch {
      return {};
    }
  }
}
