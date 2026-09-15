// The pinned npm archive uses underscores, despite its package.json entry points.
// Keep this workaround and all vendor imports inside the adapter boundary.
export const ENGINE_VERSION = '19.0.50';
export type WorkbookData = Record<string, any>;
export type WorkbookMode = 'normal' | 'readonly' | 'dashboard';
import { loadSpreadsheetModel } from './model';
import { loadWorkbookCharts } from './charts';

export async function loadSpreadsheetEngine() {
  await loadWorkbookCharts();
  const [engine, owl, templates, css, bootstrap, icons, license] = await Promise.all([
    loadSpreadsheetModel(),
    import('@odoo/owl'),
    import('@odoo/o-spreadsheet/dist/o_spreadsheet.xml?raw'),
    import('@odoo/o-spreadsheet/dist/o_spreadsheet.css?inline'),
    import('bootstrap/dist/css/bootstrap.css?inline'),
    import('font-awesome/css/font-awesome.css?inline'),
    import('@odoo/o-spreadsheet/LICENSE?url'),
  ]);
  return { ...engine, App: owl.App, templates: templates.default, licenseUrl: license.default, styles: `${bootstrap.default}\n${icons.default}\n${css.default}` };
}

export { readWorkbook } from './model';

/** The engine returns OOXML parts; an XLSX download must actually be a ZIP archive. */
export { exportWorkbookXlsx } from './files';
