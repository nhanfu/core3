import { DataGrid } from '@core3/client/components/DataGrid';
import { LineItemField, type LineItemFieldDefinition } from '@core3/client/components/LineItemField';
import { LineItemActions, type LineItemActionDefinition } from '@core3/client/components/LineItemActions';
import { appendIcon } from '@core3/client/components/Icon';
import { html } from '@core3/client/html';

type Row = Record<string, any>;

type InlineOptions = {
  fields: LineItemFieldDefinition[];
  actions: LineItemActionDefinition[];
  editAction?: string;
  createAction?: string;
  onSave: (actionId: string, row: Row, values: Row) => void | Promise<void>;
  onCancel?: () => void;
  visible?: (action: LineItemActionDefinition, row: Row) => boolean;
};

/**
 * Semantic document-line grid. It intentionally inherits DataGrid behavior so
 * sorting, selection, pagination, and action transport stay consistent.
 */
export class LineItemGrid extends DataGrid {
  private inline?: InlineOptions;

  configureInline(options: InlineOptions) { this.inline = options; }

  draw(container: HTMLElement) {
    if (!this.inline) {
      super.draw(container);
      return;
    }
    this.disposeChildren();
    const rows = (this.state.rows as Row[] | undefined) || [];
    const editingId = this.state.editingId == null ? '' : String(this.state.editingId);
    const root = html.take(container).div.className('token-panel o-x2many-grid o-line-grid').ele();
    const tableWrap = html.take(root).div.className('o-line-grid-table overflow-x-auto').ele();
    const table = html.take(tableWrap).table.className('token-table min-w-full').ele();
    const head = html.take(table).thead.trow.className('token-header').ele();
    for (const field of this.inline.fields) {
      const header = html.take(head).th.dataAttr('column', field.field).text(field.label || field.field);
      if (field.width) header.css('width', `${field.width}px`).css('minWidth', `${field.width}px`);
    }
    html.take(head).th.text('');
    const body = html.take(table).tbody.className('token-body divide-y divide-gray-100').ele();
    for (const row of rows) this.drawRow(body, root, row, editingId === String(row.id));

    // Keep the mobile representation out of the rendered layout until its
    // responsive stylesheet explicitly enables it. This prevents a stale or
    // missing generated stylesheet from showing each line twice.
    const cards = html.take(root).div.className('o-line-grid-cards').css('display', 'none').ele();
    for (const row of rows) this.drawCard(cards, row, editingId === String(row.id));

    if (Array.isArray(this.state.footerStats) && this.state.footerStats.length) {
      const footer = html.take(root).div.className('o-document-totals').ele();
      for (const stat of this.state.footerStats as any[]) {
        const value = (this.state.footerRecord as any)?.[stat.field] ?? '—';
        html.take(footer).span.className('o-document-total-label').text(stat.label || stat.field);
        html.take(footer).strong.className('o-document-total-value').text(String(value));
      }
    }

    if (this.state.actions && Array.isArray(this.state.actions)) {
      const controls = html.take(root).div.className('o-x2many-controls').ele();
      for (const action of this.state.actions as any[]) {
        const button = html.take(controls).button.className('o-x2many-create').type('button').text(action.label).ele();
        html.take(button).event('click', () => this.startCreate());
      }
    }
  }

  private fieldDefinitions() { return this.inline!.fields; }

  private rowValues(row: Row) {
    const values: Row = { ...row };
    for (const field of this.fieldDefinitions()) {
      const child = this.find(`line-field-${row.id}-${field.field}`) as LineItemField | null
        || this.find(`line-card-field-${row.id}-${field.field}`) as LineItemField | null;
      if (child) values[field.field] = child.value;
    }
    return values;
  }

  private drawRow(body: HTMLElement, root: HTMLElement, row: Row, editing: boolean) {
    const tr = html.take(body).trow.className('token-row').ele();
    for (const field of this.fieldDefinitions()) {
      const cell = html.take(tr).tdata.dataAttr('column', field.field).className('token-cell px-4 py-2').ele();
      if (field.width) html.take(cell).css('width', `${field.width}px`).css('minWidth', `${field.width}px`);
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
    for (const field of this.fieldDefinitions().slice(1)) {
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
    this.setState({ rows: [row, ...((this.state.rows as Row[]) || [])], editingId: '__new__' });
  }
}
