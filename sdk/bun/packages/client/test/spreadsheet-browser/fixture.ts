import { SpreadsheetWorkbook } from '../../src/components/SpreadsheetWorkbook';
import { SpreadsheetWorkspace } from '../../src/components/SpreadsheetWorkspace';
import { SpreadsheetDashboardClientAction } from '../../src/components/SpreadsheetDashboardClientAction';
import '../../../../sample/services/spreadsheet/styles/index.scss';
import { loadSpreadsheetEngine, exportWorkbookXlsx, readWorkbook } from '../../src/spreadsheet/engine';
import { PageRuntime } from '../../src/components/PageRoot';
import { client } from '../../src/client';

if (new URLSearchParams(location.search).has('configuration')) {
  await import('../../src/styles/tokens.scss');
  await import('../../src/styles/components.scss');
  const response = await fetch(`/api/test/dashboard-config?page=${encodeURIComponent(new URLSearchParams(location.search).get('configuration') || '')}`, { headers: { Authorization: `Bearer ${localStorage.getItem('core3_token')}` } });
  const { user, config } = await response.json();
  window.__CORE3_USER__ = user;
  client.setToken(localStorage.getItem('core3_token'));
  await new PageRuntime(config, new Map()).render(document.querySelector('#workbook')!);
} else {
const engine = await loadSpreadsheetEngine();
const data = { version: 1, sheets: [{ name: 'Sheet1', cells: { A1: '10', A2: '20', A3: '=SUM(A1:A2)' } }] };
const workspace = new URLSearchParams(location.search).has('workspace');
const dashboard = new URLSearchParams(location.search).has('dashboard');
const component = dashboard ? new SpreadsheetDashboardClientAction('verification', {
  groups_source: 'groups', dashboards_source: 'dashboards', workbooks_source: 'workbooks',
  workbook_endpoint: '/api/spreadsheet/workbooks',
  workbook_route: '/spreadsheet/workbooks',
  dataMap: {
    groups: { data: [{ id: 'group', name: 'Reports' }] },
    dashboards: { data: [{ id: 'one', group_id: 'group', name: 'Revenue' }, { id: 'two', group_id: 'group', name: '<Quarter two>' }] },
    workbooks: { data: [{ id: 'one', snapshot_status: 'ready', workbook_snapshot: data }, { id: 'two', snapshot_status: 'ready', workbook_snapshot: { version: 1, sheets: [{ name: 'Second', cells: { A1: '99', A2: '=A1+1' } }] } }] },
  },
}) : workspace ? new SpreadsheetWorkspace('verification', {
  endpoint: '/api/spreadsheet/workbooks', workbook_id: new URLSearchParams(location.search).get('workbook_id'), document_id: new URLSearchParams(location.search).get('document_id'),
}) : new SpreadsheetWorkbook('verification', {
  mode: 'normal', allow_export: true,
  workbook: { name: 'Verification', workbook_snapshot: data },
});
const linkedId = new URLSearchParams(location.search).get('linked_id');
if (dashboard && linkedId) component.state.dataMap.workbooks.data[0] = { id: 'one', snapshot_status: 'ready', workbook_id: linkedId };
component.mount(document.querySelector('#workbook')!);
Object.assign(window, { spreadsheetTest: { ...engine, exportWorkbookXlsx, readWorkbook, component } });
}
