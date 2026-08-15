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
    const root = html.take(container).section.className('o-pivot-view').ele() as HTMLElement;
    const toolbar = html.take(root).header.className('o-pivot-toolbar').ele() as HTMLElement;
    html.take(toolbar).button.type('button').className('o-pivot-configure').replaceText(this.state.builderOpen ? 'Close configuration' : (view.configLabel || 'Configure')).event('click', () => this.setState({ builderOpen: this.state.builderOpen !== true }));
    html.take(toolbar).h2.replaceText(view.label);
    if (this.state.builderOpen === true) this.drawBuilder(root);
    if (this.state.pivotError) {
      html.take(root).p.className('o-analytics-error').replaceText(String(this.state.pivotError)); return;
    }
    if (!view.measures?.length) {
      html.take(root).p.className('o-analytics-empty').replaceText('Configure the pivot to choose rows, columns, and measures.'); return;
    }
    const columns = rows.length ? Object.keys(rows[0]) : [];
    const columnDescriptors = this.pivotColumnDescriptors(columns, view);
    const visibleDataColumns = columnDescriptors.length
      ? [...columns.filter(column => !columnDescriptors.some(descriptor => descriptor.column === column)), ...columnDescriptors.filter(descriptor => !this.isColumnHidden(descriptor.values))].map(column => typeof column === 'string' ? column : column.column)
      : columns;
    const tableScroll = html.take(root).div.className('o-pivot-table-scroll').ele() as HTMLElement;
    const table = html.take(tableScroll).table.className('o-pivot-table').attr('aria-label', view.label).ele() as HTMLTableElement;
    const head = html.take(table).thead.ele() as HTMLTableSectionElement;
    if (columnDescriptors.length && view.columnFields?.length) this.drawColumnHeaders(head, columns, columnDescriptors, view);
    else {
      const headRow = html.take(head).trow.ele() as HTMLTableRowElement;
      for (const column of columns) this.addCell(headRow, this.columnLabel(column), 'th');
    }
    const body = html.take(table).tbody.ele() as HTMLTableSectionElement;
    const tree = this.buildPivotTree(rows, view.rowFields || []);
    for (const item of this.visiblePivotRows(tree)) {
      const tr = html.take(body).trow.ele() as HTMLTableRowElement;
      for (const [index, column] of visibleDataColumns.entries()) this.addPivotCell(tr, item, column, index, view.rowFields || []);
    }
    if (!rows.length) { html.take(root).p.className('o-analytics-empty').replaceText('No data'); return; }
  }

  private addCell(row: HTMLTableRowElement, text: string | number, kind: 'th' | 'td') {
    html.take(row).add(kind).replaceText(this.formatPivotValue(text));
  }

  private addPivotCell(row: HTMLTableRowElement, item: { node: PivotTreeNode; leaf: boolean }, column: string, columnIndex: number, rowFields: string[]) {
    const cell = html.take(row).tdata.ele() as HTMLTableCellElement;
    const node = item.node;
    let value = node.row?.[column];
    if (!item.leaf && rowFields.includes(column)) {
      value = column === node.field ? node.value : '';
    } else if (!item.leaf && !rowFields.includes(column)) {
      value = this.aggregatePivotValue(node.leaves, column);
    }
    if (!item.leaf && column === node.field && node.children.length) {
      html.take(cell).button.type('button').className('o-pivot-group-toggle').replaceText(this.isCollapsed(node.key) ? '+' : '−').attr('aria-label', `${this.isCollapsed(node.key) ? 'Expand' : 'Collapse'} ${String(node.value ?? '')}`).event('click', () => this.setState({ collapsed: { ...(this.state.collapsed || {}), [node.key]: !this.isCollapsed(node.key) } }));
    }
    if (rowFields.includes(column) && (item.leaf || column === node.field)) html.take(cell).css('paddingLeft', `${12 + node.level * 18}px`);
    if (value !== '') html.take(cell).span.replaceText(this.formatPivotValue(value));
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
    const first = html.take(head).trow.ele() as HTMLTableRowElement;
    rowColumns.forEach(column => html.take(first).th.prop('rowSpan', depth).replaceText(this.columnLabel(column)));
    this.drawColumnLevel(first, descriptors, 0, view);
    for (let level = 1; level < (view.columnFields || []).length; level++) {
      if (!descriptors.some(descriptor => !this.isColumnHidden(descriptor.values, level - 1))) continue;
      const row = html.take(head).trow.ele() as HTMLTableRowElement; this.drawColumnLevel(row, descriptors, level, view);
    }
    const measures = html.take(head).trow.ele() as HTMLTableRowElement;
    const visibleDescriptors = descriptors.filter(descriptor => !this.isColumnHidden(descriptor.values));
    visibleDescriptors.forEach(descriptor => {
      html.take(measures).th.replaceText(descriptor.measureLabel);
    });
    if (!visibleDescriptors.length) html.take(measures).remove();
  }

  private drawColumnLevel(row: HTMLTableRowElement, descriptors: Array<{ column: string; values: string[]; measureLabel: string }>, level: number, view: PivotViewDefinition) {
    const visible = descriptors.filter(descriptor => !this.isColumnHidden(descriptor.values, level - 1));
    let index = 0;
    while (index < visible.length) {
      const descriptor = visible[index];
      const prefix = descriptor.values.slice(0, level + 1).join('|');
      let end = index + 1;
      while (end < visible.length && visible[end].values.slice(0, level + 1).join('|') === prefix) end++;
      const cell = html.take(row).th.prop('colSpan', end - index).ele() as HTMLTableCellElement;
      const field = view.columnFields[level];
      const value = descriptor.values[level] || '';
      if (level < view.columnFields.length - 1) {
        html.take(cell).button.type('button').className('o-pivot-group-toggle').replaceText(this.isColumnCollapsed(descriptor.values, level) ? '+' : '−').attr('aria-label', `${this.isColumnCollapsed(descriptor.values, level) ? 'Expand' : 'Collapse'} ${value}`).event('click', () => this.setState({ collapsedColumns: { ...(this.state.collapsedColumns || {}), [this.columnCollapseKey(descriptor.values, level)]: !this.isColumnCollapsed(descriptor.values, level) } }));
      }
      html.take(cell).span.replaceText(`${this.options.view.fieldLabels?.[field] || field}: ${this.readablePivotValue(value)}`); index = end;
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
    const builder = html.take(container).section.className('o-pivot-builder').ele() as HTMLElement;
    html.take(builder).h3.replaceText('Pivot configuration');
    const grid = html.take(builder).div.className('o-pivot-builder-grid').ele() as HTMLElement;
    const dateRanges: Record<string, string> = { ...(view.dateRanges || {}) };
    const rowsAxis = this.axisEditor(grid, 'Rows', fields, view.rowFields || [], dateRanges);
    const columnsAxis = this.axisEditor(grid, 'Columns', fields, view.columnFields || [], dateRanges);
    const measureSection = html.take(builder).div.className('o-pivot-measures').ele() as HTMLElement;
    html.take(measureSection).label.replaceText('Measures');
    const measureHost = html.take(measureSection).div.className('o-pivot-measure-list').ele() as HTMLElement;
    const measures = (view.measures || []).map(measure => ({ ...measure }));
    const drawMeasures = () => {
      html.take(measureHost).clear();
      measures.forEach((measure, index) => {
        const row = html.take(measureHost).div.className('o-pivot-measure-row').ele() as HTMLElement;
        const field = html.take(row).select.attr('aria-label', `Measure ${index + 1} field`).ele() as HTMLSelectElement;
        this.addOptions(field, fields, measure.field || '');
        const aggregate = html.take(row).select.attr('aria-label', `Measure ${index + 1} aggregation`).ele() as HTMLSelectElement;
        this.addOptions(aggregate, ['count', 'sum', 'avg', 'min', 'max'], measure.aggregate || 'sum');
        const label = html.take(row).input.type('text').prop('placeholder', 'Label').prop('value', measure.label || '').ele() as HTMLInputElement;
        const remove = html.take(row).button.type('button').className('o-pivot-remove').replaceText('×').prop('title', 'Remove measure').ele() as HTMLButtonElement;
        html.take(field).event('change', () => { measure.field = field.value || undefined; });
        html.take(aggregate).event('change', () => { measure.aggregate = aggregate.value; });
        html.take(label).event('input', () => { measure.label = label.value || undefined; });
        html.take(remove).event('click', () => { measures.splice(index, 1); drawMeasures(); });
      });
    };
    drawMeasures();
    html.take(measureSection).button.type('button').className('o-pivot-add').replaceText('+ Add measure').event('click', () => { measures.push({ field: fields[0], aggregate: 'sum', label: fields[0] }); drawMeasures(); });
    const actions = html.take(builder).div.className('o-pivot-builder-actions').ele() as HTMLElement;
    html.take(actions).button.type('button').className('o-pivot-apply').replaceText('Apply').event('click', () => {
      const request = {
        rows: rowsAxis.values(),
        columns: columnsAxis.values(),
        measures: measures.filter(measure => measure.aggregate && (measure.aggregate === 'count' || measure.field)),
        ...((Object.keys({ ...rowsAxis.ranges(), ...columnsAxis.ranges() }).length) ? { ranges: { ...rowsAxis.ranges(), ...columnsAxis.ranges() } } : {}),
      };
      if (!request.measures.length) {
        html.take(builder).p.className('o-analytics-error').replaceText('Select at least one measure'); return;
      }
      view.rowFields = request.rows; view.columnFields = request.columns; view.measures = request.measures;
      this.options.onChange?.(request);
    });
  }

  private axisEditor(container: HTMLElement, labelText: string, fields: string[], initial: string[], ranges: Record<string, string>) {
    let values = initial.filter(field => fields.includes(field));
    const dateFields = new Set(this.options.view.dateFields || []);
    const group = html.take(container).section.className('o-pivot-builder-field o-pivot-axis').ele() as HTMLElement;
    html.take(group).h4.replaceText(labelText);
    const list = html.take(group).div.className('o-pivot-axis-list').attr('aria-label', `${labelText} fields`).ele() as HTMLElement;
    const available = html.take(group).div.className('o-pivot-axis-available').ele() as HTMLElement;
    const render = () => {
      html.take(list).clear();
      values.forEach((field, index) => {
        const item = html.take(list).div.className('o-pivot-axis-item').prop('draggable', true).dataAttr('index', String(index)).replaceText(this.options.view.fieldLabels?.[field] || field).prop('title', 'Drag to reorder').ele() as HTMLElement;
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
          const range = html.take(item).select.className('o-pivot-date-range').attr('aria-label', `${field} date range`).ele() as HTMLSelectElement;
          this.addOptions(range, ['day', 'week', 'month', 'quarter', 'year'], ranges[field] || 'month');
          html.take(range).event('change', () => { ranges[field] = range.value; });
        }
        html.take(item).button.type('button').className('o-pivot-remove').replaceText('×').prop('title', `Remove ${field}`).event('click', () => { values = values.filter((_, current) => current !== index); render(); });
      });
      html.take(available).clear();
      fields.filter(field => !values.includes(field)).forEach(field => {
        html.take(available).button.type('button').className('o-pivot-add-field').replaceText(`+ ${this.options.view.fieldLabels?.[field] || field}`).prop('title', `Add ${field}`).event('click', () => { values.push(field); render(); });
      });
      if (!available.childElementCount) html.take(available).span.className('o-pivot-axis-hint').replaceText('All fields added');
    };
    render();
    return { values: () => [...values], ranges: () => ({ ...ranges }) };
  }

  private addOptions(select: HTMLSelectElement, values: string[], selected: string | string[], labels?: Record<string, string>) {
    const selectedValues = new Set(Array.isArray(selected) ? selected : [selected]);
    for (const value of values) html.take(select).option.prop('value', value).replaceText(labels?.[value] || value).prop('selected', selectedValues.has(value));
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
