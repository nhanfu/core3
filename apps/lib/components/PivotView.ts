import { BaseComponent } from '@core3/client/components/BaseComponent';

export type PivotViewDefinition = {
  id: 'pivot'; label: string; icon?: string;
  fields?: string[];
  fieldLabels?: Record<string, string>; configLabel?: string;
  pivotColumns?: Array<{ values: string[]; prefix: string }>;
  dateFields?: string[]; dateRanges?: Record<string, string>;
  rowFields: string[]; columnFields: string[]; measures: Array<{ field?: string; aggregate: string; label?: string }>;
};

type PivotTreeNode = {
  key: string;
  level: number;
  field?: string;
  value?: unknown;
  row?: Record<string, unknown>;
  children: PivotTreeNode[];
  leaves: Record<string, unknown>[];
};

export class PivotView extends BaseComponent {
  constructor(id: string, state: { rows?: Record<string, unknown>[] } = {}, readonly options: {
    view: PivotViewDefinition; openAction?: string; rowKey?: string; pivotColumns?: Array<{ values: string[]; prefix: string }>;
    onChange?: (request: { rows: string[]; columns: string[]; measures: Array<{ field?: string; aggregate: string; label?: string }>; ranges?: Record<string, string> }) => void;
  }) { super(id, state); }

  draw(container: HTMLElement) {
    const rows = (Array.isArray(this.state.rows) ? this.state.rows : []) as Record<string, unknown>[];
    const view = { ...this.options.view, pivotColumns: this.options.pivotColumns || this.options.view.pivotColumns };
    const root = document.createElement('section'); root.className = 'o-pivot-view';
    const toolbar = document.createElement('header'); toolbar.className = 'o-pivot-toolbar';
    const configure = document.createElement('button'); configure.type = 'button'; configure.className = 'o-pivot-configure'; configure.textContent = this.state.builderOpen ? 'Close configuration' : (view.configLabel || 'Configure');
    configure.addEventListener('click', () => this.setState({ builderOpen: this.state.builderOpen !== true }));
    const title = document.createElement('h2'); title.textContent = view.label; toolbar.append(configure, title); root.appendChild(toolbar);
    if (this.state.builderOpen === true) this.drawBuilder(root);
    if (this.state.pivotError) {
      const error = document.createElement('p'); error.className = 'o-analytics-error'; error.textContent = String(this.state.pivotError); root.appendChild(error); container.appendChild(root); return;
    }
    if (!view.measures?.length) {
      const empty = document.createElement('p'); empty.className = 'o-analytics-empty'; empty.textContent = 'Configure the pivot to choose rows, columns, and measures.'; root.appendChild(empty); container.appendChild(root); return;
    }
    const columns = rows.length ? Object.keys(rows[0]) : [];
    const columnDescriptors = this.pivotColumnDescriptors(columns, view);
    const visibleDataColumns = columnDescriptors.length
      ? [...columns.filter(column => !columnDescriptors.some(descriptor => descriptor.column === column)), ...columnDescriptors.filter(descriptor => !this.isColumnHidden(descriptor.values))].map(column => typeof column === 'string' ? column : column.column)
      : columns;
    const table = document.createElement('table'); table.className = 'o-pivot-table'; table.setAttribute('aria-label', view.label);
    const head = document.createElement('thead');
    if (columnDescriptors.length && view.columnFields?.length) this.drawColumnHeaders(head, columns, columnDescriptors, view);
    else {
      const headRow = document.createElement('tr');
      for (const column of columns) this.addCell(headRow, this.columnLabel(column), 'th');
      head.appendChild(headRow);
    }
    table.appendChild(head);
    const body = document.createElement('tbody');
    const tree = this.buildPivotTree(rows, view.rowFields || []);
    for (const item of this.visiblePivotRows(tree)) {
      const tr = document.createElement('tr');
      for (const [index, column] of visibleDataColumns.entries()) this.addPivotCell(tr, item, column, index, view.rowFields || []);
      body.appendChild(tr);
    }
    table.appendChild(body);
    if (!rows.length) { const empty = document.createElement('p'); empty.className = 'o-analytics-empty'; empty.textContent = 'No data'; root.appendChild(empty); container.appendChild(root); return; }
    const tableScroll = document.createElement('div'); tableScroll.className = 'o-pivot-table-scroll'; tableScroll.appendChild(table); root.appendChild(tableScroll); container.appendChild(root);
  }

  private addCell(row: HTMLTableRowElement, text: string | number, kind: 'th' | 'td') {
    const cell = document.createElement(kind); cell.textContent = this.formatPivotValue(text); row.appendChild(cell);
  }

  private addPivotCell(row: HTMLTableRowElement, item: { node: PivotTreeNode; leaf: boolean }, column: string, columnIndex: number, rowFields: string[]) {
    const cell = document.createElement('td');
    const node = item.node;
    let value = node.row?.[column];
    if (!item.leaf && rowFields.includes(column)) {
      value = column === node.field ? node.value : '';
    } else if (!item.leaf && !rowFields.includes(column)) {
      value = this.aggregatePivotValue(node.leaves, column);
    }
    if (!item.leaf && column === node.field && node.children.length) {
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'o-pivot-group-toggle';
      toggle.textContent = this.isCollapsed(node.key) ? '+' : '−'; toggle.setAttribute('aria-label', `${this.isCollapsed(node.key) ? 'Expand' : 'Collapse'} ${String(node.value ?? '')}`);
      toggle.addEventListener('click', () => this.setState({ collapsed: { ...(this.state.collapsed || {}), [node.key]: !this.isCollapsed(node.key) } }));
      cell.appendChild(toggle);
    }
    if (rowFields.includes(column) && (item.leaf || column === node.field)) cell.style.paddingLeft = `${12 + node.level * 18}px`;
    if (value !== '') { const text = document.createElement('span'); text.textContent = this.formatPivotValue(value); cell.appendChild(text); }
    row.appendChild(cell);
  }

  private pivotColumnDescriptors(columns: string[], view: PivotViewDefinition) {
    const rowFields = new Set(view.rowFields || []);
    return columns.filter(column => !rowFields.has(column)).flatMap(column => {
      const metadata = (view.pivotColumns || [])
        .filter(candidate => column === candidate.prefix || column.startsWith(`${candidate.prefix}_`))
        .sort((left, right) => right.prefix.length - left.prefix.length)[0];
      if (!metadata) return [];
      const suffix = column.slice(metadata.prefix.length).replace(/^_/, '');
      const measure = (view.measures || []).find(candidate => this.safeMeasureLabel(candidate) === suffix)
        || ((view.measures || []).length === 1 ? view.measures[0] : undefined);
      return [{ column, values: metadata.values, measureLabel: measure?.label || measure?.field || measure?.aggregate || suffix }];
    });
  }

  private drawColumnHeaders(head: HTMLTableSectionElement, columns: string[], descriptors: Array<{ column: string; values: string[]; measureLabel: string }>, view: PivotViewDefinition) {
    const rowFields = new Set(view.rowFields || []);
    const rowColumns = columns.filter(column => rowFields.has(column));
    const depth = (view.columnFields || []).length + 1;
    const first = document.createElement('tr');
    rowColumns.forEach(column => { const cell = document.createElement('th'); cell.rowSpan = depth; cell.textContent = this.columnLabel(column); first.appendChild(cell); });
    this.drawColumnLevel(first, descriptors, 0, view);
    head.appendChild(first);
    for (let level = 1; level < (view.columnFields || []).length; level++) {
      if (!descriptors.some(descriptor => !this.isColumnHidden(descriptor.values, level - 1))) continue;
      const row = document.createElement('tr'); this.drawColumnLevel(row, descriptors, level, view); head.appendChild(row);
    }
    const measures = document.createElement('tr');
    const visibleDescriptors = descriptors.filter(descriptor => !this.isColumnHidden(descriptor.values));
    visibleDescriptors.forEach(descriptor => {
      const cell = document.createElement('th'); cell.textContent = descriptor.measureLabel; measures.appendChild(cell);
    });
    if (visibleDescriptors.length) head.appendChild(measures);
  }

  private drawColumnLevel(row: HTMLTableRowElement, descriptors: Array<{ column: string; values: string[]; measureLabel: string }>, level: number, view: PivotViewDefinition) {
    const visible = descriptors.filter(descriptor => !this.isColumnHidden(descriptor.values, level - 1));
    let index = 0;
    while (index < visible.length) {
      const descriptor = visible[index];
      const prefix = descriptor.values.slice(0, level + 1).join('|');
      let end = index + 1;
      while (end < visible.length && visible[end].values.slice(0, level + 1).join('|') === prefix) end++;
      const cell = document.createElement('th'); cell.colSpan = end - index;
      const field = view.columnFields[level];
      const value = descriptor.values[level] || '';
      if (level < view.columnFields.length - 1) {
        const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'o-pivot-group-toggle';
        toggle.textContent = this.isColumnCollapsed(descriptor.values, level) ? '+' : '−';
        toggle.setAttribute('aria-label', `${this.isColumnCollapsed(descriptor.values, level) ? 'Expand' : 'Collapse'} ${value}`);
        toggle.addEventListener('click', () => this.setState({ collapsedColumns: { ...(this.state.collapsedColumns || {}), [this.columnCollapseKey(descriptor.values, level)]: !this.isColumnCollapsed(descriptor.values, level) } }));
        cell.appendChild(toggle);
      }
      const text = document.createElement('span'); text.textContent = `${this.options.view.fieldLabels?.[field] || field}: ${this.readablePivotValue(value)}`; cell.appendChild(text);
      row.appendChild(cell); index = end;
    }
  }

  private safeMeasureLabel(measure: { field?: string; aggregate: string; label?: string }) {
    return String(measure.label || measure.field || measure.aggregate).replace(/[^A-Za-z0-9_]+/g, '_').replace(/^[^A-Za-z_]+/, '');
  }

  private columnCollapseKey(values: string[], level: number) { return `${level}:${values.slice(0, level + 1).join('|')}`; }

  private isColumnCollapsed(values: string[], level: number) { return Boolean((this.state.collapsedColumns || {})[this.columnCollapseKey(values, level)]); }

  private isColumnHidden(values: string[], ancestorLevel = values.length - 1) {
    return values.some((_, level) => level <= ancestorLevel && this.isColumnCollapsed(values, level));
  }

  private buildPivotTree(rows: Record<string, unknown>[], rowFields: string[]) {
    if (!rowFields.length) return rows.map((row, index) => ({ node: { key: `leaf-${index}`, level: 0, row, children: [], leaves: [row] }, leaf: true }));
    const root: PivotTreeNode = { key: 'root', level: -1, children: [], leaves: rows };
    for (const row of rows) {
      let parent = root;
      rowFields.forEach((field, level) => {
        const value = row[field];
        const valueKey = value == null ? 'NULL' : String(value);
        const key = `${parent.key}/${field}=${valueKey}`;
        let child = parent.children.find(candidate => candidate.key === key);
        if (!child) {
          child = { key, level, field, value, children: [], leaves: [] };
          parent.children.push(child);
        }
        child.leaves.push(row);
        parent = child;
      });
      parent.children.push({ key: `${parent.key}/leaf-${parent.children.length}`, level: rowFields.length, row, children: [], leaves: [row] });
    }
    return this.flattenPivotTree(root);
  }

  private flattenPivotTree(root: PivotTreeNode) {
    const visible: Array<{ node: PivotTreeNode; leaf: boolean }> = [];
    const visit = (node: PivotTreeNode) => {
      for (const child of node.children) {
        const leaf = child.children.length === 0;
        visible.push({ node: child, leaf });
        if (!leaf && !this.isCollapsed(child.key)) visit(child);
      }
    };
    visit(root); return visible;
  }

  private visiblePivotRows(tree: Array<{ node: PivotTreeNode; leaf: boolean }>) { return tree; }

  private isCollapsed(key: string) { return Boolean((this.state.collapsed || {})[key]); }

  private aggregatePivotValue(rows: Record<string, unknown>[], column: string) {
    const values = rows.map(row => row[column]).filter(value => typeof value === 'number') as number[];
    return values.length ? values.reduce((sum, value) => sum + value, 0) : rows[0]?.[column];
  }

  private formatPivotValue(value: unknown) {
    if (value == null) return '_';
    if (typeof value === 'number' && Number.isFinite(value)) return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
    return String(value);
  }

  private drawBuilder(container: HTMLElement) {
    const view = this.options.view;
    const fields = view.fields || [];
    const builder = document.createElement('section');
    builder.className = 'o-pivot-builder';
    const title = document.createElement('h3'); title.textContent = 'Pivot configuration'; builder.appendChild(title);
    const grid = document.createElement('div'); grid.className = 'o-pivot-builder-grid'; builder.appendChild(grid);
    const dateRanges: Record<string, string> = { ...(view.dateRanges || {}) };
    const rowsAxis = this.axisEditor(grid, 'Rows', fields, view.rowFields || [], dateRanges);
    const columnsAxis = this.axisEditor(grid, 'Columns', fields, view.columnFields || [], dateRanges);
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
        ...((Object.keys({ ...rowsAxis.ranges(), ...columnsAxis.ranges() }).length) ? { ranges: { ...rowsAxis.ranges(), ...columnsAxis.ranges() } } : {}),
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

  private axisEditor(container: HTMLElement, labelText: string, fields: string[], initial: string[], ranges: Record<string, string>) {
    let values = initial.filter(field => fields.includes(field));
    const dateFields = new Set(this.options.view.dateFields || []);
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
        if (dateFields.has(field)) {
          const range = document.createElement('select'); range.className = 'o-pivot-date-range'; range.setAttribute('aria-label', `${field} date range`);
          this.addOptions(range, ['day', 'week', 'month', 'quarter', 'year'], ranges[field] || 'month');
          range.addEventListener('change', () => { ranges[field] = range.value; }); item.appendChild(range);
        }
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
    return { values: () => [...values], ranges: () => ({ ...ranges }) };
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
    return value === 'NULL' || value === '__core3_null__' ? 'Not set' : value;
  }
}
