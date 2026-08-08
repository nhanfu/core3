import { BaseComponent } from './BaseComponent.ts';

export type PivotViewDefinition = {
  id: 'pivot'; label: string; icon?: string;
  fields?: string[];
  fieldLabels?: Record<string, string>; configLabel?: string;
  rowFields: string[]; columnFields: string[]; measures: Array<{ field?: string; aggregate: string; label?: string }>;
};

export class PivotView extends BaseComponent {
  constructor(id: string, state: { rows?: Record<string, unknown>[] } = {}, readonly options: {
    view: PivotViewDefinition; openAction?: string; rowKey?: string;
    onChange?: (request: { rows: string[]; columns: string[]; measures: Array<{ field?: string; aggregate: string; label?: string }> }) => void;
  }) { super(id, state); }

  draw(container: HTMLElement) {
    const rows = (Array.isArray(this.state.rows) ? this.state.rows : []) as Record<string, unknown>[];
    const view = this.options.view;
    const root = document.createElement('section'); root.className = 'o-pivot-view';
    const toolbar = document.createElement('header'); toolbar.className = 'o-pivot-toolbar';
    const configure = document.createElement('button'); configure.type = 'button'; configure.className = 'o-pivot-configure'; configure.textContent = this.state.builderOpen ? 'Close configuration' : (view.configLabel || 'Configure');
    configure.addEventListener('click', () => this.setState({ builderOpen: this.state.builderOpen !== true }));
    const title = document.createElement('h2'); title.textContent = view.label; toolbar.append(configure, title); root.appendChild(toolbar);
    if (this.state.builderOpen === true) this.drawBuilder(root);
    if (this.state.pivotError) {
      const error = document.createElement('p'); error.className = 'o-analytics-error'; error.textContent = String(this.state.pivotError); root.appendChild(error); container.appendChild(root); return;
    }
    if (!view.rowFields?.length || !view.columnFields?.length || !view.measures?.length) {
      const empty = document.createElement('p'); empty.className = 'o-analytics-empty'; empty.textContent = 'Configure the pivot to choose rows, columns, and measures.'; root.appendChild(empty); container.appendChild(root); return;
    }
    const columns = rows.length ? Object.keys(rows[0]) : [];
    const table = document.createElement('table'); table.className = 'o-pivot-table'; table.setAttribute('aria-label', view.label);
    const head = document.createElement('thead'); const headRow = document.createElement('tr');
    for (const column of columns) this.addCell(headRow, this.columnLabel(column), 'th');
    head.appendChild(headRow); table.appendChild(head);
    const body = document.createElement('tbody');
    for (const row of rows) { const tr = document.createElement('tr'); for (const column of columns) this.addCell(tr, row[column] as string | number, 'td'); body.appendChild(tr); }
    table.appendChild(body);
    if (!rows.length) { const empty = document.createElement('p'); empty.className = 'o-analytics-empty'; empty.textContent = 'No data'; root.appendChild(empty); container.appendChild(root); return; }
    const tableScroll = document.createElement('div'); tableScroll.className = 'o-pivot-table-scroll'; tableScroll.appendChild(table); root.appendChild(tableScroll); container.appendChild(root);
  }

  private addCell(row: HTMLTableRowElement, text: string | number, kind: 'th' | 'td') {
    const cell = document.createElement(kind); cell.textContent = text == null ? '_' : String(text); row.appendChild(cell);
  }

  private drawBuilder(container: HTMLElement) {
    const view = this.options.view;
    const fields = view.fields || [];
    const builder = document.createElement('section');
    builder.className = 'o-pivot-builder';
    const title = document.createElement('h3'); title.textContent = 'Pivot configuration'; builder.appendChild(title);
    const grid = document.createElement('div'); grid.className = 'o-pivot-builder-grid'; builder.appendChild(grid);
    const rowsAxis = this.axisEditor(grid, 'Rows', fields, view.rowFields || []);
    const columnsAxis = this.axisEditor(grid, 'Columns', fields, view.columnFields || []);
    const measureSection = document.createElement('div'); measureSection.className = 'o-pivot-measures';
    const measureTitle = document.createElement('label'); measureTitle.textContent = 'Measures'; measureSection.appendChild(measureTitle);
    const measureHost = document.createElement('div'); measureHost.className = 'o-pivot-measure-list'; measureSection.appendChild(measureHost);
    let measures = (view.measures || []).map(measure => ({ ...measure }));
    const drawMeasures = () => {
      measureHost.innerHTML = '';
      measures.forEach((measure, index) => {
        const row = document.createElement('div'); row.className = 'o-pivot-measure-row';
        const field = document.createElement('select'); field.setAttribute('aria-label', `Measure ${index + 1} field`);
        this.addOptions(field, fields, measure.field || '');
        const aggregate = document.createElement('select'); aggregate.setAttribute('aria-label', `Measure ${index + 1} aggregation`);
        this.addOptions(aggregate, ['count', 'sum', 'avg', 'min', 'max'], measure.aggregate || 'sum');
        const label = document.createElement('input'); label.type = 'text'; label.placeholder = 'Label'; label.value = measure.label || '';
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'o-pivot-remove'; remove.textContent = '×'; remove.title = 'Remove measure';
        field.addEventListener('change', () => { measure.field = field.value || undefined; });
        aggregate.addEventListener('change', () => { measure.aggregate = aggregate.value; });
        label.addEventListener('input', () => { measure.label = label.value || undefined; });
        remove.addEventListener('click', () => { measures.splice(index, 1); drawMeasures(); });
        row.append(field, aggregate, label, remove); measureHost.appendChild(row);
      });
    };
    drawMeasures();
    const addMeasure = document.createElement('button'); addMeasure.type = 'button'; addMeasure.className = 'o-pivot-add'; addMeasure.textContent = '+ Add measure';
    addMeasure.addEventListener('click', () => { measures.push({ field: fields[0], aggregate: 'sum', label: fields[0] }); drawMeasures(); });
    measureSection.appendChild(addMeasure); builder.appendChild(measureSection);
    const actions = document.createElement('div'); actions.className = 'o-pivot-builder-actions';
    const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'o-pivot-apply'; apply.textContent = 'Apply';
    apply.addEventListener('click', () => {
      const request = {
        rows: rowsAxis.values(),
        columns: columnsAxis.values(),
        measures: measures.filter(measure => measure.aggregate && (measure.aggregate === 'count' || measure.field)),
      };
      if (!request.measures.length) {
        const error = document.createElement('p'); error.className = 'o-analytics-error'; error.textContent = 'Select at least one measure.';
        builder.appendChild(error); return;
      }
      view.rowFields = request.rows; view.columnFields = request.columns; view.measures = request.measures;
      this.options.onChange?.(request);
    });
    actions.appendChild(apply); builder.appendChild(actions); container.appendChild(builder);
  }

  private axisEditor(container: HTMLElement, labelText: string, fields: string[], initial: string[]) {
    let values = initial.filter(field => fields.includes(field));
    const group = document.createElement('section'); group.className = 'o-pivot-builder-field o-pivot-axis';
    const title = document.createElement('h4'); title.textContent = labelText; group.appendChild(title);
    const list = document.createElement('div'); list.className = 'o-pivot-axis-list'; list.setAttribute('aria-label', `${labelText} fields`); group.appendChild(list);
    const available = document.createElement('div'); available.className = 'o-pivot-axis-available'; group.appendChild(available);
    const render = () => {
      list.innerHTML = '';
      values.forEach((field, index) => {
        const item = document.createElement('div'); item.className = 'o-pivot-axis-item'; item.draggable = true; item.dataset.index = String(index);
        item.textContent = this.options.view.fieldLabels?.[field] || field;
        item.title = 'Drag to reorder';
        item.addEventListener('dragstart', event => event.dataTransfer?.setData('text/plain', String(index)));
        item.addEventListener('dragover', event => event.preventDefault());
        item.addEventListener('drop', event => {
          event.preventDefault();
          const from = Number(event.dataTransfer?.getData('text/plain'));
          const to = Number(item.dataset.index);
          if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;
          const [moved] = values.splice(from, 1); values.splice(to, 0, moved); render();
        });
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'o-pivot-remove'; remove.textContent = '×'; remove.title = `Remove ${field}`;
        remove.addEventListener('click', () => { values = values.filter((_, current) => current !== index); render(); });
        item.appendChild(remove); list.appendChild(item);
      });
      available.innerHTML = '';
      fields.filter(field => !values.includes(field)).forEach(field => {
        const add = document.createElement('button'); add.type = 'button'; add.className = 'o-pivot-add-field'; add.textContent = `+ ${this.options.view.fieldLabels?.[field] || field}`; add.title = `Add ${field}`;
        add.addEventListener('click', () => { values.push(field); render(); }); available.appendChild(add);
      });
      if (!available.childElementCount) { const hint = document.createElement('span'); hint.className = 'o-pivot-axis-hint'; hint.textContent = 'All fields added'; available.appendChild(hint); }
    };
    render(); container.appendChild(group);
    return { values: () => [...values] };
  }

  private addOptions(select: HTMLSelectElement, values: string[], selected: string | string[], labels?: Record<string, string>) {
    const selectedValues = new Set(Array.isArray(selected) ? selected : [selected]);
    for (const value of values) { const option = document.createElement('option'); option.value = value; option.textContent = labels?.[value] || value; option.selected = selectedValues.has(value); select.appendChild(option); }
  }

  private columnLabel(column: string) {
    const view = this.options.view;
    if (view.fieldLabels?.[column]) return view.fieldLabels[column];
    if (column.includes('___') && view.columnFields?.length === 1) {
      const field = view.columnFields[0];
      const value = column.slice(0, column.indexOf('___'));
      const formatted = field === 'total_amount' && Number.isFinite(Number(value))
        ? new Intl.NumberFormat('vi-VN').format(Number(value))
        : value;
      return `${view.fieldLabels?.[field] || field} · ${formatted}`;
    }
    for (const measure of view.measures || []) {
      const label = measure.label || measure.field || measure.aggregate;
      const suffix = String(label).replace(/[^A-Za-z0-9_]+/g, '_');
      if (column.endsWith(`_${suffix}`)) return `${this.readablePivotValue(column.slice(0, -suffix.length - 1))} · ${label}`;
    }
    return column;
  }

  private readablePivotValue(value: string) {
    return value === 'NULL' ? 'Not set' : value;
  }
}
