import { SpreadsheetDashboardClientAction } from '@core3/client/components/SpreadsheetDashboardClientAction';

export async function mount(outlet: HTMLElement, shareId: string, token: string) {
  if (!document.querySelector('link[data-spreadsheet-public-style]')) {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = '/services/spreadsheet/styles/index.css';
    style.dataset.spreadsheetPublicStyle = 'true';
    document.head.append(style);
  }
  outlet.innerHTML = '<div class="o-public-spreadsheet-loading">Loading dashboard…</div>';
  const data = await fetch(`/dashboard/data/${encodeURIComponent(shareId)}/${encodeURIComponent(token)}`);
  if (!data.ok) {
    const body = await data.json().catch(() => ({}));
    outlet.innerHTML = `<main class="o-public-spreadsheet-error"><h1>Dashboard unavailable</h1><p>${String(body.error || 'This shared dashboard is no longer available.')}</p></main>`;
    return;
  }
  const payload = await data.json();
  const action = new SpreadsheetDashboardClientAction('public-spreadsheet-dashboard', {
    dataMap: {
      groups: { data: [{ id: 'shared', name: 'Shared dashboard' }] },
      dashboards: { data: [{ id: 'shared-dashboard', group_id: 'shared', group_name: 'Shared dashboard', name: payload.dashboard_name || 'Dashboard', published: true, snapshot_status: 'ready' }] },
      workbooks: { data: [{ id: 'shared-dashboard', name: payload.dashboard_name || 'Dashboard', snapshot_status: 'ready', workbook_snapshot: JSON.stringify(payload.snapshot || {}) }] },
      summaries: { data: [] }, chart: { data: [] }, rows: { data: [] },
    }, activeDashboardId: 'shared-dashboard', granularity: 'days', pageParams: {}, read_only: true,
  });
  outlet.replaceChildren();
  const banner = document.createElement('div');
  banner.className = 'o-public-spreadsheet-banner';
  banner.innerHTML = '<strong>Shared dashboard</strong><span>View only</span>';
  outlet.append(banner);
  action.mount(outlet);
}
