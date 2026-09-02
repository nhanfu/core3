import { DataGrid } from '@core3/client/components/DataGrid';
import { LineItemField, type LineItemFieldDefinition } from '@core3/client/components/LineItemField';
import { LineItemActions, type LineItemActionDefinition } from '@core3/client/components/LineItemActions';
import { appendIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';
import { drawColumnChooser } from '@core3/client/components/ColumnChooser';

type Row = Record<string, any>;

type InlineOptions = {
  fields: LineItemFieldDefinition[];
  actions: LineItemActionDefinition[];
  editAction?: string;
  createAction?: string;
  onSave: (actionId: string, row: Row, values: Row) => void | Promise<void>;
  onDelete?: (row: Row) => void | Promise<void>;
  onCancel?: () => void;
  visible?: (action: LineItemActionDefinition, row: Row) => boolean;
};

/**
 * Semantic document-line grid. It intentionally inherits DataGrid behavior so
 * sorting, selection, pagination, and action transport stay consistent.
 */
export class LineItemGrid extends DataGrid {
  private inline?: InlineOptions;
  private resizeCleanup?: () => void;
  private preferencesLoaded = false;
  private columnMenuOpen = false;

  configureInline(options: InlineOptions) { this.inline = options; this.loadPreferences(); }

  private columnKey(column: any) { return String(column.id || column.field); }
  private columnForField(field: LineItemFieldDefinition) { return this.columns.find(column => column.field === field.field || column.field === field.display_field); }
  private loadPreferences() {
    if (this.preferencesLoaded || !this.options.columnStorageKey || typeof localStorage === 'undefined') return;
    this.preferencesLoaded = true;
    try {
      const saved = JSON.parse(localStorage.getItem(this.options.columnStorageKey) || '{}');
      if (Array.isArray(saved.visible)) this.state.visibleColumns = saved.visible.map(String);
      if (saved.widths && typeof saved.widths === 'object') this.state.columnWidths = saved.widths;
    } catch { /* local storage is optional */ }
  }
  private persistPreferences() {
    if (!this.options.columnStorageKey || typeof localStorage === 'undefined') return;
    try { localStorage.setItem(this.options.columnStorageKey, JSON.stringify({ visible: this.state.visibleColumns, widths: this.state.columnWidths || {} })); } catch { /* local storage is optional */ }
  }
  private visibleFields() {
    const configured = this.columns.filter(column => column.field !== 'actions');
    const visible = new Set(Array.isArray(this.state.visibleColumns) ? this.state.visibleColumns.map(String) : configured.filter(column => column.optional !== 'hide').map(column => this.columnKey(column)));
    return this.fieldDefinitions().filter(field => { const column = this.columnForField(field); return !column || visible.has(this.columnKey(column)); });
  }
  private beginResize(event: MouseEvent, key: string, header: HTMLElement) {
    event.preventDefault();
    const startX = event.clientX; const startWidth = header.getBoundingClientRect().width;
    const move = (moveEvent: MouseEvent) => {
      const width = Math.max(56, Math.round(startWidth + moveEvent.clientX - startX));
      this.state.columnWidths = { ...(this.state.columnWidths || {}), [key]: width };
      header.closest('table')?.querySelectorAll<HTMLElement>(`[data-column="${key}"]`).forEach(cell => { cell.style.width = `${width}px`; cell.style.minWidth = `${width}px`; });
    };
    const stop = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); document.body.style.cursor = ''; this.persistPreferences(); this.resizeCleanup = undefined; };
    this.resizeCleanup?.(); window.addEventListener('mousemove', move); window.addEventListener('mouseup', stop); document.body.style.cursor = 'col-resize'; this.resizeCleanup = stop;
  }

  setFormEditing(editing: boolean) {
    this.setState({ formEditing: editing, editingId: editing ? '__new__' : null });
  }

  getFormDrafts() {
    if (!this.inline || this.state.formEditing !== true) return [];
    const rows = [...((this.state.rows as Row[] | undefined) || []).filter(row => String(row.id) !== '__new__'), { id: '__new__' }];
    return rows.filter(row => String(row.id) === '__new__' || this.hasChanged(row)).map(row => ({
      actionId: String(row.id) === '__new__'
        ? (this.inline!.createAction || this.inline!.editAction || 'create')
        : (this.inline!.editAction || 'edit'),
      row,
      values: this.rowValues(row),
    }));
  }

  private hasChanged(row: Row) {
    const values = this.rowValues(row);
    return this.fieldDefinitions()
      .filter(field => !field.readonly)
      .some(field => {
        const normalize = (value: unknown) => value == null || value === '' ? '' : String(value);
        return normalize(values[field.field]) !== normalize(row[field.field]);
      });
  }

  draw(container: HTMLElement) {
    this.resizeCleanup?.();
    if (!this.inline) {
      super.draw(container);
      return;
    }
    this.disposeChildren();
    const rows = (this.state.rows as Row[] | undefined) || [];
    const formEditing = this.state.formEditing === true;
    const displayRows = formEditing
      ? [...rows.filter(row => String(row.id) !== '__new__'), { id: '__new__' }]
      : rows;
    const visibleFields = this.visibleFields();
    const editingId = this.state.editingId == null ? '' : String(this.state.editingId);
    const root = html.take(container).div.className('token-panel o-x2many-grid o-line-grid relative').ele();
    if (!formEditing && this.state.actions && Array.isArray(this.state.actions)) {
      const controls = html.take(root).div.className('o-x2many-controls flex items-center justify-between gap-2').ele();
      const actionBar = html.take(controls).div.className('flex items-center gap-2').ele();
      for (const action of this.state.actions as any[]) {
        const button = html.take(actionBar).button.className('o-x2many-create').type('button').text(action.label).ele();
        html.take(button).event('click', () => this.startCreate());
      }
      if (this.options.columnChooser) {
        const details = this.drawColumnChooser(controls);
        if (this.columnMenuOpen) details.open = true;
        html.take(details).event('toggle', () => { this.columnMenuOpen = details.open; });
      }
    }
    const tableWrap = html.take(root).div.className('o-line-grid-table overflow-x-auto').ele();
    const table = html.take(tableWrap).table.className('token-table min-w-full').ele();
    const head = html.take(table).thead.trow.className('token-header').ele();
    for (const field of visibleFields) {
      const column = this.columnForField(field); const key = column ? this.columnKey(column) : field.field;
      const width = this.state.columnWidths?.[key] || field.width || column?.width;
      const headerBuilder = html.take(head).th.dataAttr('column', key).className('relative whitespace-nowrap').text(field.label || field.field);
      if (width) headerBuilder.css('width', `${width}px`).css('minWidth', `${width}px`);
      const header = headerBuilder.ele() as HTMLElement;
      const handle = html.take(header).div.className('o-line-grid-column-resize absolute right-0 top-0 h-full w-1 cursor-col-resize').attr('role', 'separator').attr('aria-label', `Resize ${field.label || field.field}`).ele();
      html.take(handle).event('mousedown', event => this.beginResize(event as MouseEvent, key, header));
    }
    html.take(head).th.text('');
    const body = html.take(table).tbody.className('token-body divide-y divide-gray-100').ele();
    for (const row of displayRows) this.drawRow(body, root, row, formEditing || editingId === String(row.id));

    // Keep the mobile representation out of the rendered layout until its
    // responsive stylesheet explicitly enables it. This prevents a stale or
    // missing generated stylesheet from showing each line twice.
    const cards = html.take(root).div.className('o-line-grid-cards').css('display', 'none').ele();
    for (const row of displayRows) this.drawCard(cards, row, formEditing || editingId === String(row.id));

    if (Array.isArray(this.state.footerStats) && this.state.footerStats.length) {
      const footer = html.take(root).div.className('o-document-totals').ele();
      for (const stat of this.state.footerStats as any[]) {
        const value = (this.state.footerRecord as any)?.[stat.field] ?? '—';
        html.take(footer).span.className('o-document-total-label').text(stat.label || stat.field);
        html.take(footer).strong.className('o-document-total-value').text(String(value));
      }
    }

  }

  private drawColumnChooser(root: HTMLElement) {
    const configured = this.columns.filter(column => column.field !== 'actions');
    const visible = new Set(this.visibleFields().map(field => this.columnKey(this.columnForField(field) || { field: field.field })));
    return drawColumnChooser(root, { columns: configured, visibleColumns: visible, menuFixed: true, onChange: next => { this.state.visibleColumns = next; this.persistPreferences(); this.columnMenuOpen = true; this.redraw(); } });
  }

  private fieldDefinitions() { return this.inline!.fields; }

  private rowValues(row: Row) {
    const values: Row = { ...row };
    for (const field of this.visibleFields()) {
      const child = this.find(`line-field-${row.id}-${field.field}`) as LineItemField | null
        || this.find(`line-card-field-${row.id}-${field.field}`) as LineItemField | null;
      if (child) values[field.field] = child.value;
    }
    return values;
  }

  private drawRow(body: HTMLElement, root: HTMLElement, row: Row, editing: boolean) {
    const tr = html.take(body).trow.className('token-row').ele();
    for (const field of this.visibleFields()) {
      const cell = html.take(tr).tdata.dataAttr('column', field.field).className('token-cell px-4 py-2').ele();
      const column = this.columnForField(field); const width = this.state.columnWidths?.[column ? this.columnKey(column) : field.field] || field.width || column?.width;
      if (width) html.take(cell).css('width', `${width}px`).css('minWidth', `${width}px`);
      if (editing && !field.readonly) {
        const value = String(row.id) === '__new__' && row[field.field] === undefined
          ? field.default
          : row[field.field];
        const child = new LineItemField(`line-field-${row.id}-${field.field}`, { definition: field, value });
        child.parent = this; this.children.push(child); child.mount(cell);
      } else {
        const displayValue = row[field.display_field || field.field];
        html.take(cell).text(displayValue == null || displayValue === '' ? '—' : String(displayValue));
      }
    }
    const actions = html.take(tr).tdata.className('token-cell px-4 py-2 text-right').ele();
    this.drawActions(actions, row, editing);
  }

  private drawCard(container: HTMLElement, row: Row, editing: boolean) {
    const card = html.take(container).div.className('o-line-card').dataAttr('row-id', String(row.id)).ele();
    const title = this.fieldDefinitions().find(field => field.field === 'description') || this.fieldDefinitions()[0];
    if (title) html.take(card).h3.className('o-line-card-title').text(String(row[title.field] ?? 'Line item'));
    for (const field of this.visibleFields().slice(1)) {
      const item = html.take(card).div.className('o-line-card-field').ele();
      html.take(item).span.className('o-line-card-label').text(field.label || field.field);
      if (editing && !field.readonly) {
        const value = String(row.id) === '__new__' && row[field.field] === undefined
          ? field.default
          : row[field.field];
        const child = new LineItemField(`line-card-field-${row.id}-${field.field}`, { definition: field, value });
        child.parent = this; this.children.push(child); child.mount(item);
      } else {
        const displayValue = row[field.display_field || field.field];
        html.take(item).span.className('o-line-card-value').text(displayValue == null || displayValue === '' ? '—' : String(displayValue));
      }
    }
    const actions = html.take(card).div.className('o-line-card-actions').ele();
    this.drawActions(actions, row, editing);
  }

  private drawActions(container: HTMLElement, row: Row, editing: boolean) {
    if (editing) {
      if (this.state.formEditing === true) {
        if (String(row.id) === '__new__' || !this.inline!.onDelete) return;
        const deleteAction = this.inline!.actions.find(action => action.id.startsWith('delete_') || action.variant === 'danger');
        if (!deleteAction || this.inline!.visible && !this.inline!.visible(deleteAction, row)) return;
        const button = html.take(container).button.type('button').className('o-x2many-row-action is-icon-only is-danger').ele();
        appendIcon(button, 'trash');
        html.take(button).attr('aria-label', deleteAction.label || 'Delete').attr('title', deleteAction.label || 'Delete');
        html.take(button).event('click', () => void this.inline!.onDelete!(row));
        return;
      }
      const save = html.take(container).button.type('button').className('o-x2many-row-action is-icon-only').ele();
      appendIcon(save, 'check');
      html.take(save).attr('aria-label', 'Save').attr('title', 'Save');
      const actionId = String(row.id) === '__new__'
        ? (this.inline!.createAction || this.inline!.editAction || 'create')
        : (this.inline!.editAction || 'edit');
      html.take(save).event('click', () => void this.inline!.onSave(actionId, row, this.rowValues(row)));
      const cancel = html.take(container).button.type('button').className('o-x2many-row-action is-icon-only').ele();
      appendIcon(cancel, 'x');
      html.take(cancel).attr('aria-label', 'Cancel').attr('title', 'Cancel');
      html.take(cancel).event('click', () => this.setState({ editingId: null }));
      return;
    }
    const actions = this.inline!.actions
      .filter(action => action.id !== this.inline!.createAction)
      .filter(action => !this.inline!.visible || this.inline!.visible(action, row));
    const child = new LineItemActions(`line-actions-${row.id}-${container.className.includes('card') ? 'card' : 'grid'}`, { actions, onAction: action => {
      if (action.id === this.inline!.editAction) this.setState({ editingId: row.id });
      else void this.submit(action.id, { row });
    }});
    child.parent = this; this.children.push(child); child.mount(container);
  }

  private startCreate() {
    const row = { id: '__new__' };
    this.setState({ rows: [...((this.state.rows as Row[]) || []), row], editingId: '__new__' });
  }
}
