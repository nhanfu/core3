import { BaseComponent } from '@core3/client/components/BaseComponent';
import { html } from '@core3/client/html';

function createFluentElement<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  return html.node(tag) as HTMLElementTagNameMap[K];
}

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
    const root = createFluentElement('section'); html.take(root).className('o-pivot-view');
    const toolbar = createFluentElement('header'); html.take(toolbar).className('o-pivot-toolbar');
    const configure = createFluentElement('button'); html.take(configure).type('button').className('o-pivot-configure').replaceText(this.state.builderOpen ? 'Close configuration' : (view.configLabel || 'Configure')).event('click', () => this.setState({ builderOpen: this.state.builderOpen !== true }));
    const title = createFluentElement('h2'); html.take(title).replaceText(view.label); html.take(toolbar).append(configure, title); html.take(root).append(toolbar);
    if (this.state.builderOpen === true) this.drawBuilder(root);
    if (this.state.pivotError) {
      const error = createFluentElement('p'); html.take(error).className('o-analytics-error').replaceText(String(this.state.pivotError)); html.take(root).append(error); html.take(container).append(root); return;
    }
    if (!view.measures?.length) {
      const empty = createFluentElement('p'); html.take(empty).className('o-analytics-empty').replaceText('Configure the pivot to choose rows, columns, and measures.'); html.take(root).append(empty); html.take(container).append(root); return;
    }
    const columns = rows.length ? Object.keys(rows[0]) : [];
    const columnDescriptors = this.pivotColumnDescriptors(columns, view);
    const visibleDataColumns = columnDescriptors.length
      ? [...columns.filter(column => !columnDescriptors.some(descriptor => descriptor.column === column)), ...columnDescriptors.filter(descriptor => !this.isColumnHidden(descriptor.values))].map(column => typeof column === 'string' ? column : column.column)
      : columns;
    const table = createFluentElement('table'); html.take(table).className('o-pivot-table').attr('aria-label', view.label);
    const head = createFluentElement('thead');
    if (columnDescriptors.length && view.columnFields?.length) this.drawColumnHeaders(head, columns, columnDescriptors, view);
    else {
      const headRow = createFluentElement('tr');
      for (const column of columns) this.addCell(headRow, this.columnLabel(column), 'th');
      html.take(head).append(headRow);
    }
    html.take(table).append(head);
    const body = createFluentElement('tbody');
    const tree = this.buildPivotTree(rows, view.rowFields || []);
    for (const item of this.visiblePivotRows(tree)) {
      const tr = createFluentElement('tr');
      for (const [index, column] of visibleDataColumns.entries()) this.addPivotCell(tr, item, column, index, view.rowFields || []);
      html.take(body).append(tr);
    }
    html.take(table).append(body);
    if (!rows.length) { const empty = createFluentElement('p'); html.take(empty).className('o-analytics-empty').replaceText('No data'); html.take(root).append(empty); html.take(container).append(root); return; }
    const tableScroll = createFluentElement('div'); html.take(tableScroll).className('o-pivot-table-scroll').append(table); html.take(root).append(tableScroll); html.take(container).append(root);
  }

  private addCell(row: HTMLTableRowElement, text: string | number, kind: 'th' | 'td') {
    const cell = createFluentElement(kind); html.take(cell).replaceText(this.formatPivotValue(text)); html.take(row).append(cell);
  }

  private addPivotCell(row: HTMLTableRowElement, item: { node: PivotTreeNode; leaf: boolean }, column: string, columnIndex: number, rowFields: string[]) {
    const cell = createFluentElement('td');
    const node = item.node;
    let value = node.row?.[column];
    if (!item.leaf && rowFields.includes(column)) {
      value = column === node.field ? node.value : '';
    } else if (!item.leaf && !rowFields.includes(column)) {
      value = this.aggregatePivotValue(node.leaves, column);
    }
    if (!item.leaf && column === node.field && node.children.length) {
      const toggle = createFluentElement('button'); html.take(toggle).type('button').className('o-pivot-group-toggle').replaceText(this.isCollapsed(node.key) ? '+' : '−').attr('aria-label', `${this.isCollapsed(node.key) ? 'Expand' : 'Collapse'} ${String(node.value ?? '')}`).event('click', () => this.setState({ collapsed: { ...(this.state.collapsed || {}), [node.key]: !this.isCollapsed(node.key) } }));
      html.take(cell).append(toggle);
    }
    if (rowFields.includes(column) && (item.leaf || column === node.field)) html.take(cell).css('paddingLeft', `${12 + node.level * 18}px`);
    if (value !== '') { const text = createFluentElement('span'); html.take(text).replaceText(this.formatPivotValue(value)); html.take(cell).append(text); }
    html.take(row).append(cell);
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
    const first = createFluentElement('tr');
    rowColumns.forEach(column => { const cell = createFluentElement('th'); html.take(cell).prop('rowSpan', depth).replaceText(this.columnLabel(column)); html.take(first).append(cell); });
    this.drawColumnLevel(first, descriptors, 0, view);
    html.take(head).append(first);
    for (let level = 1; level < (view.columnFields || []).length; level++) {
      if (!descriptors.some(descriptor => !this.isColumnHidden(descriptor.values, level - 1))) continue;
      const row = createFluentElement('tr'); this.drawColumnLevel(row, descriptors, level, view); html.take(head).append(row);
    }
    const measures = createFluentElement('tr');
    const visibleDescriptors = descriptors.filter(descriptor => !this.isColumnHidden(descriptor.values));
    visibleDescriptors.forEach(descriptor => {
      const cell = createFluentElement('th'); html.take(cell).replaceText(descriptor.measureLabel); html.take(measures).append(cell);
    });
    if (visibleDescriptors.length) html.take(head).append(measures);
  }

  private drawColumnLevel(row: HTMLTableRowElement, descriptors: Array<{ column: string; values: string[]; measureLabel: string }>, level: number, view: PivotViewDefinition) {
    const visible = descriptors.filter(descriptor => !this.isColumnHidden(descriptor.values, level - 1));
    let index = 0;
    while (index < visible.length) {
      const descriptor = visible[index];
      const prefix = descriptor.values.slice(0, level + 1).join('|');
      let end = index + 1;
      while (end < visible.length && visible[end].values.slice(0, level + 1).join('|') === prefix) end++;
      const cell = createFluentElement('th'); html.take(cell).prop('colSpan', end - index);
      const field = view.columnFields[level];
      const value = descriptor.values[level] || '';
      if (level < view.columnFields.length - 1) {
        const toggle = createFluentElement('button'); html.take(toggle).type('button').className('o-pivot-group-toggle').replaceText(this.isColumnCollapsed(descriptor.values, level) ? '+' : '−').attr('aria-label', `${this.isColumnCollapsed(descriptor.values, level) ? 'Expand' : 'Collapse'} ${value}`).event('click', () => this.setState({ collapsedColumns: { ...(this.state.collapsedColumns || {}), [this.columnCollapseKey(descriptor.values, level)]: !this.isColumnCollapsed(descriptor.values, level) } }));
        html.take(cell).append(toggle);
      }
      const text = createFluentElement('span'); html.take(text).replaceText(`${this.options.view.fieldLabels?.[field] || field}: ${this.readablePivotValue(value)}`); html.take(cell).append(text);
      html.take(row).append(cell); index = end;
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
    const builder = createFluentElement('section');
    html.take(builder).className('o-pivot-builder');
    const title = createFluentElement('h3'); html.take(title).replaceText('Pivot configuration'); html.take(builder).append(title);
    const grid = createFluentElement('div'); html.take(grid).className('o-pivot-builder-grid'); html.take(builder).append(grid);
    const dateRanges: Record<string, string> = { ...(view.dateRanges || {}) };
    const rowsAxis = this.axisEditor(grid, 'Rows', fields, view.rowFields || [], dateRanges);
    const columnsAxis = this.axisEditor(grid, 'Columns', fields, view.columnFields || [], dateRanges);
    const measureSection = createFluentElement('div'); html.take(measureSection).className('o-pivot-measures');
    const measureTitle = createFluentElement('label'); html.take(measureTitle).replaceText('Measures'); html.take(measureSection).append(measureTitle);
    const measureHost = createFluentElement('div'); html.take(measureHost).className('o-pivot-measure-list'); html.take(measureSection).append(measureHost);
    let measures = (view.measures || []).map(measure => ({ ...measure }));
    const drawMeasures = () => {
      html.take(measureHost).clear();
      measures.forEach((measure, index) => {
        const row = createFluentElement('div'); html.take(row).className('o-pivot-measure-row');
        const field = createFluentElement('select'); html.take(field).attr('aria-label', `Measure ${index + 1} field`);
        this.addOptions(field, fields, measure.field || '');
        const aggregate = createFluentElement('select'); html.take(aggregate).attr('aria-label', `Measure ${index + 1} aggregation`);
        this.addOptions(aggregate, ['count', 'sum', 'avg', 'min', 'max'], measure.aggregate || 'sum');
        const label = createFluentElement('input'); html.take(label).type('text').prop('placeholder', 'Label').prop('value', measure.label || '');
        const remove = createFluentElement('button'); html.take(remove).type('button').className('o-pivot-remove').replaceText('×').prop('title', 'Remove measure');
        html.take(field).event('change', () => { measure.field = field.value || undefined; });
        html.take(aggregate).event('change', () => { measure.aggregate = aggregate.value; });
        html.take(label).event('input', () => { measure.label = label.value || undefined; });
        html.take(remove).event('click', () => { measures.splice(index, 1); drawMeasures(); });
        html.take(row).append(field, aggregate, label, remove); html.take(measureHost).append(row);
      });
    };
    drawMeasures();
    const addMeasure = createFluentElement('button'); html.take(addMeasure).type('button').className('o-pivot-add').replaceText('+ Add measure').event('click', () => { measures.push({ field: fields[0], aggregate: 'sum', label: fields[0] }); drawMeasures(); });
    html.take(measureSection).append(addMeasure); html.take(builder).append(measureSection);
    const actions = createFluentElement('div'); html.take(actions).className('o-pivot-builder-actions');
    const apply = createFluentElement('button'); html.take(apply).type('button').className('o-pivot-apply').replaceText('Apply').event('click', () => {
      const request = {
        rows: rowsAxis.values(),
        columns: columnsAxis.values(),
        measures: measures.filter(measure => measure.aggregate && (measure.aggregate === 'count' || measure.field)),
        ...((Object.keys({ ...rowsAxis.ranges(), ...columnsAxis.ranges() }).length) ? { ranges: { ...rowsAxis.ranges(), ...columnsAxis.ranges() } } : {}),
      };
      if (!request.measures.length) {
        const error = createFluentElement('p'); html.take(error).className('o-analytics-error').replaceText('Select at least one measure'); html.take(builder).append(error); return;
      }
      view.rowFields = request.rows; view.columnFields = request.columns; view.measures = request.measures;
      this.options.onChange?.(request);
    });
    html.take(actions).append(apply); html.take(builder).append(actions); html.take(container).append(builder);
  }

  private axisEditor(container: HTMLElement, labelText: string, fields: string[], initial: string[], ranges: Record<string, string>) {
    let values = initial.filter(field => fields.includes(field));
    const dateFields = new Set(this.options.view.dateFields || []);
    const group = createFluentElement('section'); html.take(group).className('o-pivot-builder-field o-pivot-axis');
    const title = createFluentElement('h4'); html.take(title).replaceText(labelText); html.take(group).append(title);
    const list = createFluentElement('div'); html.take(list).className('o-pivot-axis-list').attr('aria-label', `${labelText} fields`); html.take(group).append(list);
    const available = createFluentElement('div'); html.take(available).className('o-pivot-axis-available'); html.take(group).append(available);
    const render = () => {
      html.take(list).clear();
      values.forEach((field, index) => {
        const item = createFluentElement('div'); html.take(item).className('o-pivot-axis-item').prop('draggable', true).dataAttr('index', String(index)).replaceText(this.options.view.fieldLabels?.[field] || field).prop('title', 'Drag to reorder');
        html.take(item).event('dragstart', event => event.dataTransfer?.setData('text/plain', String(index)));
        html.take(item).event('dragover', event => event.preventDefault());
        html.take(item).event('drop', event => {
          event.preventDefault();
          const from = Number(event.dataTransfer?.getData('text/plain'));
          const to = Number(item.dataset.index);
          if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;
          const [moved] = values.splice(from, 1); values.splice(to, 0, moved); render();
        });
        if (dateFields.has(field)) {
          const range = createFluentElement('select'); html.take(range).className('o-pivot-date-range').attr('aria-label', `${field} date range`);
          this.addOptions(range, ['day', 'week', 'month', 'quarter', 'year'], ranges[field] || 'month');
          html.take(range).event('change', () => { ranges[field] = range.value; }); html.take(item).append(range);
        }
        const remove = createFluentElement('button'); html.take(remove).type('button').className('o-pivot-remove').replaceText('×').prop('title', `Remove ${field}`).event('click', () => { values = values.filter((_, current) => current !== index); render(); });
        html.take(item).append(remove); html.take(list).append(item);
      });
      html.take(available).clear();
      fields.filter(field => !values.includes(field)).forEach(field => {
        const add = createFluentElement('button'); html.take(add).type('button').className('o-pivot-add-field').replaceText(`+ ${this.options.view.fieldLabels?.[field] || field}`).prop('title', `Add ${field}`).event('click', () => { values.push(field); render(); }); html.take(available).append(add);
      });
      if (!available.childElementCount) { const hint = createFluentElement('span'); html.take(hint).className('o-pivot-axis-hint').replaceText('All fields added'); html.take(available).append(hint); }
    };
    render(); html.take(container).append(group);
    return { values: () => [...values], ranges: () => ({ ...ranges }) };
  }

  private addOptions(select: HTMLSelectElement, values: string[], selected: string | string[], labels?: Record<string, string>) {
    const selectedValues = new Set(Array.isArray(selected) ? selected : [selected]);
    for (const value of values) { const option = createFluentElement('option'); html.take(option).prop('value', value).replaceText(labels?.[value] || value).prop('selected', selectedValues.has(value)); html.take(select).append(option); }
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
