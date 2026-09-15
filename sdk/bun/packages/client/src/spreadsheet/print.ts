import { loadSpreadsheetEngine } from './engine';

/** Print from an authorized, frozen server snapshot; the editor DOM is never printed. */
export async function openWorkbookPrint(container: HTMLElement, payload: any) {
  const { Model, chartHelpers } = await loadSpreadsheetEngine();
  if (!container.isConnected) return;
  const model = new Model(payload.snapshot, { mode: 'readonly' });
  const dialog = document.createElement('dialog');
  dialog.style.cssText = 'width:90vw;max-width:1200px;height:90vh';
  const title = document.createElement('h2'); title.textContent = 'Print spreadsheet';
  const controls = document.createElement('div'); controls.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap';
  const sheets = document.createElement('select'); sheets.setAttribute('aria-label', 'Print sheet');
  for (const sheet of payload.snapshot.sheets) {
    if (sheet.isVisible === false) continue;
    const option = document.createElement('option'); option.value = sheet.id; option.textContent = sheet.name; sheets.append(option);
  }
  const allSheets = document.createElement('option'); allSheets.value = ''; allSheets.textContent = 'All visible sheets'; sheets.append(allSheets);
  const range = document.createElement('input'); range.setAttribute('aria-label', 'Print range'); range.placeholder = 'Range, e.g. A1:F40 (blank: used cells)'; range.style.width = '300px';
  const orientation = document.createElement('select'); orientation.setAttribute('aria-label', 'Paper orientation');
  for (const value of ['portrait', 'landscape']) { const option = document.createElement('option'); option.value = value; option.textContent = value; orientation.append(option); }
  const setup = payload.page_setup;
  const paperSize = document.createElement('select'); paperSize.setAttribute('aria-label', 'Paper size');
  for (const paper of setup.paper_sizes) { const option = document.createElement('option'); option.value = paper.id; option.textContent = paper.label; paperSize.append(option); }
  paperSize.value = setup.default_paper;
  const marginLabel = document.createElement('label'); marginLabel.textContent = 'Margins (mm) ';
  const margin = document.createElement('input'); margin.type = 'number'; margin.min = '0'; margin.max = String(setup.max_margin_mm); margin.step = '0.5'; margin.value = String(setup.margin_mm); margin.setAttribute('aria-label', 'Print margins (mm)'); margin.style.width = '70px'; marginLabel.append(margin);
  const repeatLabel = document.createElement('label'); repeatLabel.textContent = 'Repeat header rows ';
  const repeatRows = document.createElement('input'); repeatRows.type = 'number'; repeatRows.min = '0'; repeatRows.max = String(setup.max_repeat_rows); repeatRows.step = '1'; repeatRows.value = '0'; repeatRows.setAttribute('aria-label', 'Repeat header rows'); repeatRows.style.width = '55px'; repeatLabel.append(repeatRows);
  const update = document.createElement('button'); update.type = 'button'; update.textContent = 'Update preview';
  const print = document.createElement('button'); print.type = 'button'; print.textContent = 'Print / Save PDF';
  const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close'; close.onclick = () => dialog.close();
  controls.append(sheets, range, paperSize, orientation, marginLabel, repeatLabel, update, print, close);
  const feedback = document.createElement('p'); feedback.setAttribute('role', 'alert');
  const note = document.createElement('p'); note.textContent = 'Fitted to paper width and margins. Repeated headers use the first visible rows of each selected range. This preview uses saved values from when it was prepared.';
  const frame = document.createElement('iframe'); frame.title = 'Workbook print preview'; frame.style.cssText = 'width:100%;height:70%;border:1px solid #ccc;background:white';
  dialog.append(title, controls, note, feedback, frame); container.append(dialog); dialog.showModal();
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (dialog.open) dialog.close();
    dialog.remove(); void model.leaveSession().catch(() => {});
  };
  dialog.addEventListener('close', dispose, { once: true });
  const coordinate = (address: string) => {
    const match = /^([A-Z]+)([1-9][0-9]*)$/.exec(address);
    if (!match) throw new Error('Use a cell range such as A1:F40.');
    let col = 0;
    for (const letter of match[1]) col = col * 26 + letter.charCodeAt(0) - 64;
    return { col: col - 1, row: Number(match[2]) - 1 };
  };
  let rendering = 0;
  const render = async () => {
    const generation = ++rendering;
    print.disabled = true; feedback.textContent = '';
    const doc = frame.contentDocument!;
    doc.body.replaceChildren(); doc.head.replaceChildren();
    try {
      const paper = setup.paper_sizes.find((paper: any) => paper.id === paperSize.value);
      const marginMm = Number(margin.value);
      const repeat = Number(repeatRows.value);
      if (!repeatRows.value.trim() || !Number.isSafeInteger(repeat) || repeat < 0 || repeat > setup.max_repeat_rows) throw new Error(`Choose between 0 and ${setup.max_repeat_rows} repeated header rows.`);
      if (!paper || !margin.value.trim() || !Number.isFinite(marginMm) || marginMm < 0 || marginMm > setup.max_margin_mm) throw new Error(`Enter margins between 0 and ${setup.max_margin_mm} mm.`);
      const paperWidth = orientation.value === 'landscape' ? paper.height_mm : paper.width_mm;
      const paperHeight = orientation.value === 'landscape' ? paper.width_mm : paper.height_mm;
      const printableWidth = (paperWidth - 2 * marginMm) * 96 / 25.4;
      const style = doc.createElement('style');
      style.textContent = `@page { size:${paperWidth}mm ${paperHeight}mm; margin:${marginMm}mm } body{font:12px Arial;margin:0;color:#111;print-color-adjust:exact} h1{font-size:16px} table{border-collapse:collapse;table-layout:fixed} td{border:1px solid #ddd;padding:2px;overflow:hidden;vertical-align:middle} tr{break-inside:avoid} thead{display:table-header-group;break-inside:avoid} @media screen{body{padding:20px}}`;
      doc.head.append(style);
      const selected = payload.snapshot.sheets.filter((sheet: any) => sheet.isVisible !== false && (!sheets.value || sheet.id === sheets.value));
      if (!selected.length) throw new Error('Choose a visible sheet.');
      const images: HTMLImageElement[] = [];
      let cellCount = 0;
      let figurePixels = 0;
      for (const [sheetIndex, sheet] of selected.entries()) {
        const figures = model.getters.getFigures(sheet.id).map((figure: any) => model.getters.getFigureUI(sheet.id, figure));
        const endIndex = (pixel: number, count: number, dimensions: (index: number) => any) => {
          let low = 0, high = count - 1;
          while (low < high) { const mid = Math.floor((low + high) / 2); if (dimensions(mid).end < pixel) low = mid + 1; else high = mid; }
          return low;
        };
        let left = 0, top = 0, right = 0, bottom = 0;
        if (range.value.trim()) {
          const parts = range.value.trim().toUpperCase().split(':');
          if (parts.length > 2) throw new Error('Use one rectangular range.');
          const first = coordinate(parts[0]), last = coordinate(parts[1] || parts[0]);
          left = first.col; top = first.row; right = last.col; bottom = last.row;
        } else {
          for (const address of Object.keys(sheet.cells)) {
            const position = coordinate(address); right = Math.max(right, position.col); bottom = Math.max(bottom, position.row);
          }
          for (const merge of model.getters.getMerges(sheet.id)) { right = Math.max(right, merge.right); bottom = Math.max(bottom, merge.bottom); }
          for (const figure of figures) {
            right = Math.max(right, endIndex(figure.x + figure.width, sheet.colNumber, index => model.getters.getColDimensions(sheet.id, index)));
            bottom = Math.max(bottom, endIndex(figure.y + figure.height, sheet.rowNumber, index => model.getters.getRowDimensions(sheet.id, index)));
          }
        }
        if (left > right || top > bottom || right >= sheet.colNumber || bottom >= sheet.rowNumber) throw new Error('The range must be within the selected sheet.');
        cellCount += (right - left + 1) * (bottom - top + 1);
        if (cellCount > payload.max_cells) throw new Error(`Choose a range of at most ${payload.max_cells.toLocaleString()} cells.`);
        const cols = Array.from({ length: right - left + 1 }, (_, i) => i + left).filter(col => !model.getters.isColHidden(sheet.id, col));
        const rows = Array.from({ length: bottom - top + 1 }, (_, i) => i + top).filter(row => !model.getters.isRowHidden(sheet.id, row));
        if (repeat && repeat >= rows.length) throw new Error('Leave at least one visible body row after the repeated headers.');
        const headerRows = new Set(rows.slice(0, repeat));
        doc.title = `${payload.name} — ${sheet.name}`;
        const content = doc.createElement('main');
        if (sheetIndex) content.style.breakBefore = 'page';
        const tableWidth = cols.reduce((sum, col) => sum + model.getters.getColSize(sheet.id, col), 0);
        const width = range.value.trim() ? tableWidth : figures.reduce((max: number, figure: any) => Math.max(max, figure.x + figure.width), tableWidth);
        content.style.zoom = String(Math.min(1, printableWidth / Math.max(1, width)));
        const heading = doc.createElement('h1'); heading.textContent = doc.title; content.append(heading);
        const grid = doc.createElement('section'); grid.style.position = 'relative'; grid.style.width = `${width}px`; grid.style.overflow = 'clip';
        const table = doc.createElement('table'); table.style.width = `${tableWidth}px`;
        const colgroup = doc.createElement('colgroup');
        // Percentages keep collapsed outer borders inside the fixed table width.
        for (const col of cols) { const node = doc.createElement('col'); node.style.width = `${model.getters.getColSize(sheet.id, col) / tableWidth * 100}%`; colgroup.append(node); }
        table.append(colgroup);
        const header = doc.createElement('thead'), body = doc.createElement('tbody');
        if (repeat) table.append(header);
        table.append(body);
        const merged = new Map<string, any>();
        const visibleColSet = new Set(cols), visibleRowSet = new Set(rows);
        for (const merge of model.getters.getMerges(sheet.id)) {
          if (merge.right < left || merge.left > right || merge.bottom < top || merge.top > bottom) continue;
          const visibleCols: number[] = [], visibleRows: number[] = [];
          for (let col = Math.max(left, merge.left); col <= Math.min(right, merge.right); col++) if (visibleColSet.has(col)) visibleCols.push(col);
          for (let row = Math.max(top, merge.top); row <= Math.min(bottom, merge.bottom); row++) if (visibleRowSet.has(row)) visibleRows.push(row);
          if (visibleRows.some(row => headerRows.has(row)) && visibleRows.some(row => !headerRows.has(row))) throw new Error('A merged cell crosses the repeated header boundary. Adjust the header row count.');
          for (const row of visibleRows) for (const col of visibleCols) merged.set(`${col},${row}`, { merge, anchor: col === visibleCols[0] && row === visibleRows[0], cols: visibleCols.length, rows: visibleRows.length, bounds: { left: visibleCols[0], right: visibleCols.at(-1), top: visibleRows[0], bottom: visibleRows.at(-1) } });
        }
        for (const row of rows) {
          const tr = doc.createElement('tr'); tr.style.height = `${model.getters.getRowSize(sheet.id, row)}px`;
          for (const col of cols) {
            const merge = merged.get(`${col},${row}`);
            if (merge && !merge.anchor) continue;
            const position = { sheetId: sheet.id, col: merge?.merge.left ?? col, row: merge?.merge.top ?? row };
            const cell = doc.createElement('td');
            if (merge) { cell.colSpan = merge.cols; cell.rowSpan = merge.rows; }
            cell.textContent = model.getters.getCellText(position);
            const format = model.getters.getCellComputedStyle(position);
            const bounds = merge?.bounds || { left: col, right: col, top: row, bottom: row };
            const bordersAt = (col: number, row: number) => col >= 0 && col < sheet.colNumber && row >= 0 && row < sheet.rowNumber ? model.getters.getCellComputedBorder({ sheetId: sheet.id, col, row }) || {} : {};
            const upper = bordersAt(bounds.left, bounds.top), lower = bordersAt(bounds.right, bounds.bottom);
            const borders = {
              top: upper.top || bordersAt(bounds.left, bounds.top - 1).bottom,
              left: upper.left || bordersAt(bounds.left - 1, bounds.top).right,
              bottom: lower.bottom || bordersAt(bounds.right, bounds.bottom + 1).top,
              right: lower.right || bordersAt(bounds.right + 1, bounds.bottom).left,
            };
            for (const [side, border] of Object.entries(borders) as Array<[string, any]>) {
              if (!border) continue;
              const width = border.style === 'thick' ? 3 : border.style === 'medium' ? 2 : 1;
              const style = border.style === 'dashed' || border.style === 'dotted' ? border.style : 'solid';
              cell.style.setProperty(`border-${side}`, `${width}px ${style} ${border.color || '#000000'}`);
            }
            cell.style.fontWeight = format.bold ? 'bold' : 'normal'; cell.style.fontStyle = format.italic ? 'italic' : 'normal';
            cell.style.textDecoration = [format.underline ? 'underline' : '', format.strikethrough ? 'line-through' : ''].filter(Boolean).join(' ');
            cell.style.fontSize = `${format.fontSize || 10}pt`; cell.style.color = format.textColor || ''; cell.style.backgroundColor = format.fillColor || '';
            cell.style.textAlign = format.align || (model.getters.getEvaluatedCell(position).type === 'number' ? 'right' : 'left');
            cell.style.whiteSpace = format.wrapping === 'wrap' ? 'pre-wrap' : 'pre';
            tr.append(cell);
          }
          (headerRows.has(row) ? header : body).append(tr);
        }
        grid.append(table); content.append(grid); doc.body.append(content);
        if (repeat && header.getBoundingClientRect().height > (paperHeight - 2 * marginMm) * 96 / 25.4 / 4) throw new Error('Repeated headers must fit within one quarter of the printable page height.');
        const originX = model.getters.getColDimensions(sheet.id, left).start;
        const originY = model.getters.getRowDimensions(sheet.id, top).start;
        const height = range.value.trim() ? rows.reduce((sum, row) => sum + model.getters.getRowSize(sheet.id, row), 0) : figures.reduce((max: number, figure: any) => Math.max(max, figure.y + figure.height), rows.reduce((sum, row) => sum + model.getters.getRowSize(sheet.id, row), 0));
        grid.style.minHeight = `${height}px`;
        for (const figure of figures) {
          const x = figure.x - originX, y = figure.y - originY;
          if (x >= width || y >= height || x + figure.width <= 0 || y + figure.height <= 0) continue;
          figurePixels += figure.width * figure.height;
          if (figurePixels > payload.max_figure_pixels) throw new Error('Figures exceed the print size limit. Select a smaller range or resize the figures.');
          let source: string;
          if (figure.tag === 'chart') {
            const chartId = model.getters.getChartIds(sheet.id).find((id: string) => model.getters.getFigureIdFromChartId(id) === figure.id);
            if (!chartId) throw new Error('A chart is unavailable for printing.');
            source = chartHelpers.chartToImageUrl(model.getters.getChartRuntime(chartId), figure, model.getters.getChartType(chartId));
          } else if (figure.tag === 'image') source = model.getters.getImagePath(figure.id);
          else throw new Error('This figure type is not supported for printing yet.');
          if (!/^data:image\/(png|jpeg|gif|webp)[;,]/i.test(source || '')) throw new Error('A figure could not be rendered. Embed a supported image before printing.');
          const img = doc.createElement('img'); img.alt = figure.tag === 'chart' ? 'Workbook chart' : 'Workbook image'; img.src = source;
          img.style.position = 'absolute'; img.style.left = `${x}px`; img.style.top = `${y}px`; img.style.width = `${figure.width}px`; img.style.height = `${figure.height}px`;
          grid.append(img); images.push(img);
        }
      }
      if (selected.length > 1) doc.title = payload.name;
      await Promise.all(images.map(img => img.decode()));
      if (disposed || generation !== rendering) return false;
      print.disabled = false;
      return true;
    } catch (error: any) { if (!disposed && generation === rendering) feedback.textContent = error.message; return false; }
  };
  update.onclick = () => { void render(); }; sheets.onchange = () => { range.value = ''; range.disabled = !sheets.value; void render(); }; orientation.onchange = () => { void render(); };
  paperSize.onchange = margin.onchange = repeatRows.onchange = () => { void render(); };
  print.onclick = async () => { if (await render()) { frame.contentWindow!.focus(); frame.contentWindow!.print(); } };
  void render();
  return dispose;
}
