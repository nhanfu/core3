import { apiFetch, getUser } from '/tms/app.js';
import { i18n } from '/tms/i18n.js';
import { html } from '/lib/html.js';
import { StatRow } from '/lib/components/StatRow.js';
import { GridView } from '/lib/components/GridView.js';

export async function mount(container) {
  const user = getUser();
  const canFinancials = user?.permissions?.includes('reports.financials');

  // Page header
  const header = html.take(container).div.className('page-header').getContext();
  html.take(header).h1.className('page-title').text(i18n.t('reports', null, 'Reports'));
  html.take(header).p.className('page-subtitle').text('Fleet analytics and performance reports');

  // Tab bar + content area
  let activeTab = 'utilization';
  const tabContainer = html.take(container).div
    .style('display:flex;gap:0;border-bottom:1px solid var(--color-border,#e5e7eb);margin-top:16px')
    .getContext();
  const contentContainer = html.take(container).div.style('margin-top:20px').getContext();

  function renderTabs() {
    tabContainer.innerHTML = '';
    const tabs = [
      { id: 'utilization', label: 'Fleet Utilization' },
      ...(canFinancials ? [{ id: 'cost', label: 'Cost Analysis' }] : []),
      { id: 'drivers', label: 'Driver Performance' },
    ];
    for (const tab of tabs) {
      const isActive = activeTab === tab.id;
      html.take(tabContainer).button
        .className(`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`)
        .text(tab.label)
        .event('click', () => switchTab(tab.id));
    }
  }

  async function switchTab(tabId) {
    activeTab = tabId;
    renderTabs();
    contentContainer.innerHTML = '';
    if (tabId === 'utilization') await loadUtilization();
    else if (tabId === 'cost')   await loadCost();
    else if (tabId === 'drivers') await loadDrivers();
  }

  // ── Fleet Utilization ─────────────────────────────────────────────────

  async function loadUtilization() {
    const loadingEl = html.take(contentContainer).div
      .className('text-sm text-gray-400')
      .style('padding:20px')
      .text('Loading…')
      .getContext();
    try {
      const res = await apiFetch('/api/v1/reports/fleet-utilization');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      contentContainer.innerHTML = '';

      const summary = data.summary ?? {};
      const trucks  = Array.isArray(data.trucks) ? data.trucks : (Array.isArray(data) ? data : []);

      // StatRow
      const statEl = html.take(contentContainer).div.getContext();
      const statRow = new StatRow('util-stats', [
        { label: 'Total Trucks',      value: summary.total_trucks ?? 0,           color: 'indigo' },
        { label: 'Active',            value: summary.active_trucks ?? 0,           color: 'green' },
        { label: 'Utilization',       value: `${summary.avg_utilization_pct ?? 0}%`, color: 'green' },
        { label: 'Drivers Assigned',  value: summary.assigned_drivers ?? 0,        color: 'blue' },
      ]);
      statRow.mount(statEl);

      // GridView of trucks
      const gridEl = html.take(contentContainer).div.style('margin-top:16px').getContext();
      const grid = new GridView('util-grid', { rows: trucks, meta: null }, [
        { id: 'plate',   type: 'TextCell',   field: 'plate',   label: 'Plate' },
        { id: 'model',   type: 'TextCell',   field: 'model',   label: 'Model' },
        { id: 'type',    type: 'BadgeCell',   field: 'type',    label: 'Type' },
        { id: 'status',  type: 'BadgeCell',   field: 'status',  label: 'Status' },
        { id: 'mileage', type: 'NumberCell',  field: 'mileage', label: 'Mileage' },
      ]);
      grid.mount(gridEl);
    } catch (err) {
      contentContainer.innerHTML = '';
      html.take(contentContainer).div.className('alert alert-error').text(err.message);
    }
  }

  // ── Cost Analysis ─────────────────────────────────────────────────────

  async function loadCost() {
    html.take(contentContainer).div
      .className('text-sm text-gray-400')
      .style('padding:20px')
      .text('Loading…');
    try {
      const res = await apiFetch('/api/v1/reports/cost-analysis');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      contentContainer.innerHTML = '';

      const rows = Array.isArray(data) ? data : (data.rows ?? data.data ?? []);

      html.take(contentContainer).h3
        .style('font-size:1rem;font-weight:600;margin-bottom:12px;color:var(--color-text)')
        .text('Cost by Service Type');

      const wrapper = html.take(contentContainer).div
        .className('overflow-x-auto rounded-lg border border-gray-200')
        .getContext();
      const table = html.take(wrapper).table
        .className('min-w-full divide-y divide-gray-200')
        .getContext();
      const theadRow = html.take(table).thead.className('bg-gray-50').trow.getContext();
      for (const col of ['Service Type', 'Count', 'Total Cost']) {
        html.take(theadRow).th
          .className('px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider')
          .text(col);
      }
      const tbody = html.take(table).tbody.className('bg-white divide-y divide-gray-100').getContext();

      if (!rows.length) {
        html.take(tbody).trow
          .tdata.attr('colspan', '3')
          .className('px-4 py-10 text-center text-sm text-gray-400')
          .text('No data available');
      } else {
        for (const row of rows) {
          const tr = html.take(tbody).trow.className('hover:bg-gray-50').getContext();
          html.take(tr).tdata.className('px-4 py-3 text-sm text-gray-900').text(row.service_type ?? '—');
          html.take(tr).tdata.className('px-4 py-3 text-sm text-gray-600').text(String(row.count ?? 0));
          html.take(tr).tdata.className('px-4 py-3 text-sm text-gray-600').text(
            row.total_cost != null
              ? Number(row.total_cost).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
              : '—'
          );
        }
      }
    } catch (err) {
      contentContainer.innerHTML = '';
      html.take(contentContainer).div.className('alert alert-error').text(err.message);
    }
  }

  // ── Driver Performance ────────────────────────────────────────────────

  async function loadDrivers() {
    html.take(contentContainer).div
      .className('text-sm text-gray-400')
      .style('padding:20px')
      .text('Loading…');
    try {
      const res = await apiFetch('/api/v1/reports/driver-performance');
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      contentContainer.innerHTML = '';

      const rawRows = Array.isArray(data) ? data : (data.rows ?? data.data ?? []);
      // Pre-format completion_rate as a string for TextCell display
      const rows = rawRows.map(r => ({
        ...r,
        completion_rate_display: r.completion_rate != null ? `${r.completion_rate}%` : '—',
      }));

      const gridEl = html.take(contentContainer).div.getContext();
      const grid = new GridView('drivers-grid', { rows, meta: null }, [
        { id: 'driver_name',      type: 'TextCell',   field: 'driver_name',             label: 'Driver Name' },
        { id: 'total_trips',      type: 'NumberCell',  field: 'total_trips',             label: 'Total Trips' },
        { id: 'completed_trips',  type: 'NumberCell',  field: 'completed_trips',          label: 'Completed' },
        { id: 'total_km',         type: 'NumberCell',  field: 'total_km',                label: 'Distance (km)' },
        { id: 'completion_rate',  type: 'TextCell',    field: 'completion_rate_display',  label: 'Completion %' },
      ]);
      grid.mount(gridEl);
    } catch (err) {
      contentContainer.innerHTML = '';
      html.take(contentContainer).div.className('alert alert-error').text(err.message);
    }
  }

  // Initial render
  renderTabs();
  await loadUtilization();
}
