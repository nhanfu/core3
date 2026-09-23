import { describe, expect, it, vi } from 'vitest';
import { SpreadsheetDashboardClientAction } from '@core3/client/components/SpreadsheetDashboardClientAction';

const mounted = vi.hoisted(() => vi.fn());
vi.mock('../../src/adapters/SpreadsheetAdapter', () => ({ SpreadsheetAdapter: class {
  mount(element: HTMLElement, options: any) { mounted(options); options.onReady({}); }
  dispose() {}
} }));

const dataMap = {
  groups: { data: [{ id: 'sales', name: 'Sales' }] },
  dashboards: { data: [{ id: 'sales-dashboard', group_id: 'sales', group_name: 'Sales', name: 'Sales', favorite: true, snapshot_status: 'ready' }] },
  workbooks: { data: [{ id: 'sales-dashboard', snapshot_status: 'ready', workbook_snapshot: '{"sheets":[{"name":"Sheet1","cells":{"A1":"Sales dashboard","B2":"=SUM(B5:B7)"}}]}' }] },
  summaries: { data: [{ dashboard_id: 'sales-dashboard', revenue: 184250, orders: 1284, customers: 642 }] },
  chart: { data: [{ dashboard_id: 'sales-dashboard', period: 'Jan', revenue: 28500 }] },
  rows: { data: [{ dashboard_id: 'sales-dashboard', country: 'Vietnam', category: 'Services', revenue: 42100, orders: 284 }] },
};

function mount(definition: any, state: Record<string, string> = {}, submit?: (action: string, params: any) => unknown) {
  const container = document.createElement('div');
  const resolved = SpreadsheetDashboardClientAction.resolveState(definition, { dataMap, state });
  const action = new SpreadsheetDashboardClientAction('spreadsheet-dashboard-test', resolved);
  if (submit) action._transport = { submit };
  action.mount(container);
  return container;
}

describe('SpreadsheetDashboardClientAction', () => {
  it('mounts the selected stored workbook in engine dashboard mode', () => {
    const container = mount({ groups_source: 'groups', dashboards_source: 'dashboards', workbooks_source: 'workbooks', summaries_source: 'summaries', chart_source: 'chart', rows_source: 'rows', favorite_action: 'toggle_dashboard_favorite' });
    expect(container.querySelector('.o-spreadsheet-readonly')?.textContent).toBe('Read-only');
    expect(container.querySelector('.o-spreadsheet-dashboard-sidebar')?.textContent).toContain('Sales');
    expect(mounted).toHaveBeenCalledWith(expect.objectContaining({ mode: 'dashboard', data: dataMap.workbooks.data[0].workbook_snapshot }));
    expect(container.querySelector('.o-spreadsheet-dashboard-engine')).not.toBeNull();
    expect(container.querySelector('.o-spreadsheet-dashboard-mobile-picker')).not.toBeNull();
  });

  it('submits the declared favorite action for the selected dashboard', async () => {
    const calls: any[] = [];
    const container = mount({ groups_source: 'groups', dashboards_source: 'dashboards', workbooks_source: 'workbooks', summaries_source: 'summaries', chart_source: 'chart', rows_source: 'rows', favorite_action: 'toggle_dashboard_favorite' }, {}, (action, params) => calls.push({ action, params }));
    await (container.querySelector('.o-spreadsheet-dashboard-favorite') as HTMLButtonElement).click();
    expect(calls).toEqual([{ action: 'toggle_dashboard_favorite', params: { state: { dashboard_id: 'sales-dashboard' }, row: expect.objectContaining({ id: 'sales-dashboard' }) } }]);
  });

  it('renders stable empty, missing, and malformed snapshot states', () => {
    const empty = mount({ groups_source: 'groups', dashboards_source: 'dashboards', workbooks_source: 'workbooks', summaries_source: 'summaries', chart_source: 'chart', rows_source: 'rows', default_dashboard_id: 'sales-dashboard' }, { fixture_state: 'error' });
    expect(empty.querySelector('.o-spreadsheet-dashboard-state.is-error')).not.toBeNull();

    const missingState = SpreadsheetDashboardClientAction.resolveState({ groups_source: 'groups', dashboards_source: 'dashboards', workbooks_source: 'workbooks', summaries_source: 'summaries', chart_source: 'chart', rows_source: 'rows', default_dashboard_id: 'missing' }, { dataMap, state: { dashboard_id: 'missing' } });
    const missingContainer = document.createElement('div');
    new SpreadsheetDashboardClientAction('spreadsheet-dashboard-missing-test', missingState).mount(missingContainer);
    expect(missingContainer.querySelector('.o-spreadsheet-dashboard-state.is-missing')).not.toBeNull();
  });
});
