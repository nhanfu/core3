import { JSDOM } from 'jsdom';
import { createCanvas, Path2D } from '@napi-rs/canvas';
import { loadSpreadsheetModel } from '@core3/client/spreadsheet/model';
import { exportWorkbookXlsx, readWorkbookXlsx } from '@core3/client/spreadsheet/files';
import { workbookDataQuery, workbookDataValue } from '@core3/client/spreadsheet/data-query';
import { workbookStringLiteral } from '@core3/client/spreadsheet/string-literal';
import { loadWorkbookCharts } from '@core3/client/spreadsheet/charts';

// The upstream model shares its bundle with Owl. Supply DOM parsing APIs inside
// this worker only; it never mounts UI or receives database/network credentials.
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://workbook.invalid', pretendToBeVisual: true });
(dom.window as any).Path2D = Path2D;
const canvases = new WeakMap<object, ReturnType<typeof createCanvas>>();
(dom.window.HTMLCanvasElement.prototype as any).getContext = function(type: string) {
  if (type !== '2d') return null;
  let canvas = canvases.get(this);
  if (!canvas) { canvas = createCanvas(this.width, this.height); canvases.set(this, canvas); }
  if (canvas.width !== this.width) canvas.width = this.width;
  if (canvas.height !== this.height) canvas.height = this.height;
  return canvas.getContext('2d');
};
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (!(key in globalThis) || ['Event', 'CustomEvent', 'EventTarget'].includes(key)) {
    Object.defineProperty(globalThis, key, { configurable: true, get: () => (dom.window as any)[key] });
  }
}
globalThis.fetch = async () => { throw new Error('External network access is unavailable in workbook validation'); };
const { Model } = await loadSpreadsheetModel();
await loadWorkbookCharts();
class ValidatedModel extends Model {
  checkDispatchAllowed(command: any) {
    const result = super.checkDispatchAllowed(command);
    if (!result.isSuccessful) throw new Error(`Invalid ${command.type}: ${result.reasons.join(', ')}`);
    return result;
  }
}
const models = new Map<string, any>();
// Render models contain actor-scoped results and never enter the validation LRU.
const renders = new Map<string, { model: any; pages: Map<string, any[]>; pending: Map<string, any>; errors: Set<string> }>();
const dispose = (id: string) => {
  const render = renders.get(id);
  if (render) { render.model.updateMode('readonly'); void render.model.leaveSession(); renders.delete(id); }
  const model = models.get(id);
  if (model) { model.updateMode('readonly'); void model.leaveSession(); models.delete(id); }
};
function remember(id: string, model: any) {
  models.delete(id); models.set(id, model);
  // Cache is an optimization; the committed snapshot/log remains authoritative.
  while (models.size > 4) dispose(models.keys().next().value!);
}

async function execute(task: any) {
  if (task.operation === 'invalidate') { dispose(task.id); return {}; }
  if (task.operation === 'import') {
    const warnings: string[] = [];
    const warn = console.warn;
    let model: any;
    try {
      console.warn = (...values) => { warnings.push(values.map(String).join(' ')); };
      model = new ValidatedModel(readWorkbookXlsx(task.bytes, task.maxExpandedBytes, task.maxFiles), {}, [], undefined, true);
      return { snapshot: model.exportData(), warnings };
    } finally {
      console.warn = warn;
      if (model) { model.updateMode('readonly'); void model.leaveSession(); }
    }
  }
  let model = models.get(task.id);
  if (task.operation === 'render') {
    let render = renders.get(task.id);
    if (task.state) {
      dispose(task.id);
      const catalog = new Map<string, any>(task.catalog.map((source: any) => [source.key, source]));
      const context = { model: undefined as any, pages: new Map<string, any[]>(), pending: new Map<string, any>(), errors: new Set<string>() };
      const core3Data = { read(source: unknown, field: unknown, row: unknown, filters: unknown) {
        try {
          const descriptor = workbookDataQuery(catalog, source, field, row, filters);
          const data = context.pages.get(descriptor.key);
          if (!data) { context.pending.set(descriptor.key, descriptor.query); return { error: 'Loading Core3 data' }; }
          return { value: workbookDataValue(data, descriptor.index, descriptor.field) };
        } catch (error: any) { context.errors.add(error.message); return { error: error.message }; }
      } };
      context.model = new ValidatedModel(task.state.snapshot, { client: { id: task.id, name: 'Export' }, custom: { core3Data } }, task.state.revisions);
      renders.set(task.id, context); render = context;
    }
    if (!render) throw new Error('Workbook render session unavailable');
    model = render.model;
    if (model.session.getRevisionId() !== task.head) throw new Error('Workbook changed while loading render state');
    for (const page of task.pages || []) render.pages.set(page.key, page.data);
    render.pending.clear(); render.errors.clear();
    model.dispatch('EVALUATE_CELLS');
    for (const sheetId of model.getters.getSheetIds()) {
      for (const position of model.getters.getEvaluatedCellsPositions(sheetId)) model.getters.getEvaluatedCell(position);
    }
    // A dependent filter may be temporarily invalid while an earlier query loads.
    if (render.pending.size) return { queries: [...render.pending].map(([key, query]) => ({ key, query })) };
    if (render.errors.size) throw new Error([...render.errors][0]);
    task.operation = task.mode;
    task.authorized = true;
  } else if (task.state) {
    dispose(task.id);
    model = new ValidatedModel(task.state.snapshot, { client: { id: 'server-validator', name: 'Server' } }, task.state.revisions);
    remember(task.id, model);
  }
  if (!model || model.session.getRevisionId() !== task.head) return { needs_state: true };
  if (!task.authorized) remember(task.id, model);
  if (task.operation === 'apply') {
    model.session.onMessageReceived(task.message);
    if (model.session.getRevisionId() !== task.message.nextRevisionId) throw new Error('The revision did not advance the engine');
    return { revision_id: task.message.nextRevisionId };
  }
  if (task.operation === 'snapshot') return { snapshot: model.exportData() };
  if (!task.authorized && (task.operation === 'freeze' || task.operation === 'export')) {
    for (const sheetId of model.getters.getSheetIds()) {
      if (Object.values(model.getters.getCells(sheetId)).some((cell: any) => cell.isFormula && /CORE3\.VALUE\s*\(/i.test(cell.content))) throw new Error('Live Core3 formulas require authorized server evaluation before export or publishing');
    }
  }
  if (task.operation === 'freeze') {
    const snapshot = model.exportData();
    for (const sheet of snapshot.sheets) {
      for (const figure of sheet.figures || []) {
        if (figure.tag === 'image' && !String(figure.data?.path || '').startsWith('data:image/')) throw new Error('Embed workbook images before publishing a fixed snapshot');
      }
      const cells: Record<string, string> = {};
      for (const position of model.getters.getEvaluatedCellsPositions(sheet.id)) {
        const cell = model.getters.getEvaluatedCell(position);
        let column = position.col + 1;
        let address = '';
        while (column) { address = String.fromCharCode(65 + (column - 1) % 26) + address; column = Math.floor((column - 1) / 26); }
        address += position.row + 1;
        // Constant string expressions preserve numeric-looking text and leading
        // '=' without introducing a visible apostrophe or executable references.
        cells[address] = typeof cell.value === 'string' ? `=${workbookStringLiteral(cell.value)}` : typeof cell.value === 'boolean' ? String(cell.value).toUpperCase() : cell.value == null ? '' : String(cell.value);
      }
      sheet.cells = cells;
    }
    return { snapshot };
  }
  if (task.operation === 'export') {
    const bytes = await exportWorkbookXlsx(model);
    // Upstream export recalculates again. Volatile filters can discover another
    // page; never return the intermediate file containing loading values.
    const render = renders.get(task.id);
    if (render?.pending.size) return { queries: [...render.pending].map(([key, query]) => ({ key, query })) };
    if (render?.errors.size) throw new Error([...render.errors][0]);
    return { bytes };
  }
  throw new Error('Unknown engine operation');
}

self.onmessage = async (event: MessageEvent) => {
  const task = event.data;
  try { self.postMessage({ request_id: task.request_id, result: await execute(task) }); }
  catch (error: any) {
    // A rejected multi-command revision may have partially changed the cache.
    // Evict it; the next request reconstructs exclusively from committed data.
    dispose(task.id);
    self.postMessage({ request_id: task.request_id, error: error.message || 'Invalid workbook operation' });
  }
};
