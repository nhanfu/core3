/**
 * test/lib/components.js
 *
 * All demo component implementations.
 * Use: import { GridView, TextCell, FormPanel, ... } from './components.js';
 * Requires a local HTTP server (ES module imports).
 */

import { HTML } from '../../html.js';
import { BaseComponent } from './runtime.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  'active':         'bg-green-100 text-green-800',
  'in service':     'bg-green-100 text-green-800',
  'maintenance':    'bg-amber-100 text-amber-800',
  'in maintenance': 'bg-amber-100 text-amber-800',
  'out of service': 'bg-red-100 text-red-800',
  'inactive':       'bg-gray-100 text-gray-600',
  'completed':      'bg-green-100 text-green-800',
  'in progress':    'bg-blue-100 text-blue-800',
  'scheduled':      'bg-purple-100 text-purple-800',
  'overdue':        'bg-red-100 text-red-800',
  'pending':        'bg-gray-100 text-gray-700',
  'resolved':       'bg-green-100 text-green-800',
  'open':           'bg-amber-100 text-amber-800',
  'high':           'bg-red-100 text-red-800',
  'medium':         'bg-amber-100 text-amber-800',
  'low':            'bg-green-100 text-green-800',
  'critical':       'bg-red-100 text-red-900',
  'oil change':     'bg-blue-100 text-blue-800',
  'inspection':     'bg-teal-100 text-teal-800',
  'tire':           'bg-gray-100 text-gray-700',
  'brake':          'bg-orange-100 text-orange-800',
  'semi':           'bg-indigo-100 text-indigo-800',
  'box truck':      'bg-violet-100 text-violet-800',
  'flatbed':        'bg-cyan-100 text-cyan-800',
};

function badgeHtml(value, color) {
  if (!value) return '<span class="text-gray-400 text-sm">—</span>';
  const cls = color || STATUS_COLORS[String(value).toLowerCase()] || 'bg-gray-100 text-gray-700';
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}">${esc(value)}</span>`;
}

function formatDate(value, format = 'short') {
  if (!value) return '—';
  const d = new Date(String(value).includes('T') ? value : value + 'T00:00:00');
  if (isNaN(d)) return String(value);
  if (format === 'relative') {
    const diffMs = Date.now() - d.getTime();
    const absDays = Math.floor(Math.abs(diffMs) / 86400000);
    const future = diffMs < 0;
    if (absDays === 0) return 'Today';
    if (absDays === 1) return future ? 'Tomorrow' : 'Yesterday';
    if (absDays < 30) return future ? `In ${absDays} days` : `${absDays} days ago`;
    const absWeeks = Math.floor(absDays / 7);
    return future ? `In ${absWeeks}w` : `${absWeeks}w ago`;
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtCurrency(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value ?? 0);
}

function fmtNumber(value, format = 'number') {
  if (value == null) return '—';
  if (format === 'percent') return Number(value).toFixed(1) + '%';
  return new Intl.NumberFormat('en-US').format(value);
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Cell components ──────────────────────────────────────────────────────────

export class TextCell extends BaseComponent {
  draw(container) {
    const { value, secondary } = this.state;
    if (secondary != null) {
      container.innerHTML = `
        <div class="flex flex-col">
          <span class="text-sm font-medium text-gray-900">${esc(value) || '—'}</span>
          <span class="text-xs text-gray-500 mt-0.5">${esc(secondary)}</span>
        </div>`;
    } else {
      container.innerHTML = `<span class="text-sm text-gray-900">${esc(value) || '—'}</span>`;
    }
  }
}

export class BadgeCell extends BaseComponent {
  draw(container) {
    container.innerHTML = badgeHtml(this.state.value, this.state.color);
  }
}

export class CurrencyCell extends BaseComponent {
  draw(container) {
    const { value, currency = 'USD' } = this.state;
    if (value == null) {
      container.innerHTML = '<span class="text-sm text-gray-400">—</span>';
    } else {
      container.innerHTML = `<span class="text-sm text-gray-900 tabular-nums block text-right">${fmtCurrency(value, currency)}</span>`;
    }
  }
}

export class NumberCell extends BaseComponent {
  draw(container) {
    const { value, format = 'number' } = this.state;
    if (value == null) {
      container.innerHTML = '<span class="text-sm text-gray-400">—</span>';
    } else {
      container.innerHTML = `<span class="text-sm text-gray-900 tabular-nums">${fmtNumber(value, format)}</span>`;
    }
  }
}

export class DateCell extends BaseComponent {
  draw(container) {
    const { value, format = 'short', overdue = false } = this.state;
    const text = formatDate(value, format);
    const cls = overdue ? 'text-sm text-red-600 font-medium' : 'text-sm text-gray-900';
    container.innerHTML = `<span class="${cls}">${esc(text)}</span>`;
  }
}

export class BooleanCell extends BaseComponent {
  draw(container) {
    container.innerHTML = this.state.value
      ? '<span class="text-green-600 text-sm font-medium">✓</span>'
      : '<span class="text-gray-400 text-sm">—</span>';
  }
}

export class ActionCell extends BaseComponent {
  draw(container) {
    const { actions = [], row = {} } = this.state;
    const btnHtml = actions.map(a => {
      const cls = {
        primary: 'text-indigo-600 hover:text-indigo-900',
        danger:  'text-red-600 hover:text-red-900',
        ghost:   'text-gray-400 hover:text-gray-600',
      }[a.variant] || 'text-gray-600 hover:text-gray-900';
      return `<button data-action-id="${esc(a.id)}" class="text-sm font-medium ${cls} transition-colors">${esc(a.label)}</button>`;
    }).join('');
    container.innerHTML = `<div class="flex gap-3">${btnHtml}</div>`;
    container.querySelectorAll('[data-action-id]').forEach(btn => {
      btn.addEventListener('click', () => this.submit(btn.dataset.actionId, { row }));
    });
  }
}

// ─── CELL_MAP — referenced by GridView ───────────────────────────────────────

const CELL_MAP = { TextCell, BadgeCell, CurrencyCell, NumberCell, DateCell, BooleanCell, ActionCell };

// ─── GridView ─────────────────────────────────────────────────────────────────

export class GridView extends BaseComponent {
  /**
   * @param {string} id
   * @param {{ rows: object[], meta: { total: number, page: number, pageSize: number }, loading?: boolean }} state
   * @param {object[]} defs  column definitions (type, id, field, label, ...)
   */
  constructor(id, state, defs = []) {
    super(id, state);
    this.defs = defs;
  }

  _cellState(def, row) {
    const value = row[def.field];
    switch (def.type) {
      case 'BadgeCell':    return { value, color: def.colorField ? row[def.colorField] : null };
      case 'CurrencyCell': return { value, currency: def.currency || 'USD' };
      case 'NumberCell':   return { value, format: def.format || 'number' };
      case 'DateCell':     return { value, format: def.format || 'short', overdue: def.overdueField ? !!row[def.overdueField] : false };
      case 'BooleanCell':  return { value: !!value };
      case 'ActionCell':   return { actions: def.actions || [], row };
      default:             return { value, secondary: def.secondary ? row[def.secondary] : null };
    }
  }

  _paginationHtml(meta) {
    if (meta == null || meta.total == null) return '';
    const { total = 0, page = 1, pageSize = 25 } = meta;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return `
      <div class="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white rounded-b-lg">
        <span class="text-sm text-gray-600">${start}–${end} of ${total}</span>
        <div class="flex items-center gap-2">
          <button data-grid-prev class="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" ${page <= 1 ? 'disabled' : ''}>← Prev</button>
          <span class="text-sm text-gray-500 px-1">${page} / ${totalPages}</span>
          <button data-grid-next class="px-3 py-1 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed" ${page >= totalPages ? 'disabled' : ''}>Next →</button>
        </div>
      </div>`;
  }

  draw(container) {
    this.children = [];
    const { rows = [], meta = {}, loading = false } = this.state;

    // Header
    const headerCells = this.defs.map(d => {
      const align = d.align === 'right' ? 'text-right' : d.align === 'center' ? 'text-center' : 'text-left';
      return `<th class="px-4 py-3 ${align} text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">${esc(d.label || '')}</th>`;
    }).join('');

    // Body
    let bodyHtml;
    if (loading) {
      bodyHtml = Array(5).fill(null).map(() =>
        `<tr>${this.defs.map(() => `<td class="px-4 py-3"><div class="h-4 bg-gray-100 rounded animate-pulse skeleton"></div></td>`).join('')}</tr>`
      ).join('');
    } else if (!rows.length) {
      bodyHtml = `<tr><td colspan="${this.defs.length}" class="px-4 py-10 text-center text-sm text-gray-400">No records found</td></tr>`;
    } else {
      bodyHtml = rows.map(row =>
        `<tr class="hover:bg-gray-50 transition-colors">${
          this.defs.map(d => `<td class="px-4 py-3" data-cell="${esc(this.id)}-${esc(String(row.id ?? ''))}-${esc(d.id)}"></td>`).join('')
        }</tr>`
      ).join('');
    }

    container.innerHTML = `
      <div class="overflow-x-auto rounded-lg border border-gray-200">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50"><tr>${headerCells}</tr></thead>
          <tbody class="bg-white divide-y divide-gray-100">${bodyHtml}</tbody>
        </table>
        ${this._paginationHtml(meta)}
      </div>`;

    // Mount cell components into td placeholders
    if (!loading && rows.length) {
      for (const row of rows) {
        for (const def of this.defs) {
          const cellAttr = `${this.id}-${String(row.id ?? '')}-${def.id}`;
          const td = container.querySelector(`[data-cell="${cellAttr}"]`);
          if (!td) continue;
          const Cls = CELL_MAP[def.type] || TextCell;
          const cell = new Cls(cellAttr, this._cellState(def, row));
          cell.parent = this;
          this.children.push(cell);
          cell.draw(td);
        }
      }
    }

    // Pagination handlers
    const prevBtn = container.querySelector('[data-grid-prev]');
    const nextBtn = container.querySelector('[data-grid-next]');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const { page = 1 } = this.state.meta || {};
        if (page > 1) this.setState({ meta: { ...this.state.meta, page: page - 1 } });
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const { page = 1, total = 0, pageSize = 25 } = this.state.meta || {};
        const totalPages = Math.ceil(total / pageSize);
        if (page < totalPages) this.setState({ meta: { ...this.state.meta, page: page + 1 } });
      });
    }
  }
}

// ─── ListView ─────────────────────────────────────────────────────────────────

export class ListView extends BaseComponent {
  constructor(id, state, defs = []) {
    super(id, state);
    this.defs = defs;
  }

  draw(container) {
    const { items = [], loading = false } = this.state;
    if (loading) {
      container.innerHTML = Array(3).fill(`
        <div class="bg-white rounded-lg border border-gray-200 p-4 space-y-2 animate-pulse">
          <div class="h-4 bg-gray-100 rounded w-1/3"></div>
          <div class="h-3 bg-gray-100 rounded w-2/3"></div>
        </div>`).join('');
      return;
    }
    if (!items.length) {
      container.innerHTML = '<div class="py-8 text-center text-sm text-gray-400">No items</div>';
      return;
    }
    const primaryDef = this.defs[0];
    const secondaryDef = this.defs.find(d => d.secondary);
    const badgeDef = this.defs.find(d => d.type === 'BadgeCell');
    container.innerHTML = `<div class="flex flex-col gap-2">${items.map(item => `
      <div class="bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 transition-colors cursor-pointer">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="text-sm font-medium text-gray-900">${esc(primaryDef ? item[primaryDef.field] : '')}</p>
            ${secondaryDef ? `<p class="text-xs text-gray-500 mt-0.5">${esc(item[secondaryDef.field])}</p>` : ''}
          </div>
          ${badgeDef ? badgeHtml(item[badgeDef.field], null) : ''}
        </div>
      </div>`).join('')}</div>`;
  }
}

// ─── Form components ──────────────────────────────────────────────────────────

export class TextInput extends BaseComponent {
  /**
   * @param {string} id
   * @param {{ value: string, error?: string|null }} state
   * @param {{ label?: string, field?: string, required?: boolean, readonly?: boolean, placeholder?: string }} def
   */
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '', error = null } = this.state;
    const d = this.def;
    const borderCls = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500';
    const bgCls = d.readonly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white';
    container.innerHTML = `
      <div class="flex flex-col gap-1">
        ${d.label ? `<label class="text-sm font-medium text-gray-700">${esc(d.label)}${d.required ? ' <span class="text-red-500">*</span>' : ''}</label>` : ''}
        <input type="text"
          class="w-full px-3 py-2 text-sm border ${borderCls} rounded-md focus:outline-none focus:ring-2 ${bgCls}"
          value="${esc(value)}"
          ${d.readonly ? 'readonly' : ''}
          ${d.placeholder ? `placeholder="${esc(d.placeholder)}"` : ''}
        />
        ${error ? `<span class="text-xs text-red-600">${esc(error)}</span>` : ''}
      </div>`;
    const inp = container.querySelector('input');
    if (inp && !d.readonly) {
      inp.addEventListener('input', e => this.setState({ value: e.target.value, error: null }, false));
    }
  }
}

export class NumberInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '', error = null } = this.state;
    const d = this.def;
    const borderCls = error ? 'border-red-500' : 'border-gray-300';
    container.innerHTML = `
      <div class="flex flex-col gap-1">
        ${d.label ? `<label class="text-sm font-medium text-gray-700">${esc(d.label)}${d.required ? ' <span class="text-red-500">*</span>' : ''}</label>` : ''}
        <input type="number"
          class="w-full px-3 py-2 text-sm border ${borderCls} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          value="${value ?? ''}"
          ${d.min != null ? `min="${d.min}"` : ''}
          ${d.max != null ? `max="${d.max}"` : ''}
          ${d.step != null ? `step="${d.step}"` : ''}
        />
        ${error ? `<span class="text-xs text-red-600">${esc(error)}</span>` : ''}
      </div>`;
    const inp = container.querySelector('input');
    if (inp) inp.addEventListener('input', e => this.setState({ value: e.target.valueAsNumber, error: null }, false));
  }
}

export class SelectInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '', options = [] } = this.state;
    const d = this.def;
    const opts = options.map(o => `<option value="${esc(o)}" ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('');
    container.innerHTML = `
      <div class="flex flex-col gap-1">
        ${d.label ? `<label class="text-sm font-medium text-gray-700">${esc(d.label)}${d.required ? ' <span class="text-red-500">*</span>' : ''}</label>` : ''}
        <select class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">— Select —</option>${opts}
        </select>
      </div>`;
    const sel = container.querySelector('select');
    if (sel) sel.addEventListener('change', e => this.setState({ value: e.target.value }, false));
  }
}

export class DateInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '' } = this.state;
    const d = this.def;
    container.innerHTML = `
      <div class="flex flex-col gap-1">
        ${d.label ? `<label class="text-sm font-medium text-gray-700">${esc(d.label)}</label>` : ''}
        <input type="date"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          value="${esc(value)}"
          ${d.min ? `min="${esc(d.min)}"` : ''}
          ${d.max ? `max="${esc(d.max)}"` : ''}
        />
      </div>`;
    const inp = container.querySelector('input');
    if (inp) inp.addEventListener('change', e => this.setState({ value: e.target.value }, false));
  }
}

export class TextareaInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = '' } = this.state;
    const d = this.def;
    container.innerHTML = `
      <div class="flex flex-col gap-1">
        ${d.label ? `<label class="text-sm font-medium text-gray-700">${esc(d.label)}</label>` : ''}
        <textarea
          rows="${d.rows || 3}"
          class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-y"
          ${d.placeholder ? `placeholder="${esc(d.placeholder)}"` : ''}
        >${esc(value)}</textarea>
      </div>`;
    const ta = container.querySelector('textarea');
    if (ta) ta.addEventListener('input', e => this.setState({ value: e.target.value }, false));
  }
}

export class CheckboxInput extends BaseComponent {
  constructor(id, state, def = {}) {
    super(id, state);
    this.def = def;
  }

  draw(container) {
    const { value = false } = this.state;
    const d = this.def;
    container.innerHTML = `
      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" ${value ? 'checked' : ''} />
        ${d.label ? `<span class="text-sm font-medium text-gray-700">${esc(d.label)}</span>` : ''}
      </label>`;
    const inp = container.querySelector('input');
    if (inp) inp.addEventListener('change', e => this.setState({ value: e.target.checked }, false));
  }
}

// ─── FormPanel ────────────────────────────────────────────────────────────────

export class FormPanel extends BaseComponent {
  /**
   * @param {string} id
   * @param {{ saving?: boolean, dirty?: boolean, values?: object, errors?: object }} state
   * @param {{ title?: string }} def
   */
  constructor(id, state, def = {}) {
    super(id, state || { saving: false, dirty: false, values: {}, errors: {} });
    this.def = def;
    this._fields = [];
  }

  /** Register an input component so FormPanel can collect + validate it. */
  registerField(comp) {
    this._fields.push(comp);
    comp.parent = this;
    if (!this.children.includes(comp)) this.children.push(comp);
    return comp;
  }

  collectValues() {
    const values = {};
    for (const f of this._fields) {
      const key = (f.def && f.def.field) || f.id;
      values[key] = f.state.value;
    }
    return values;
  }

  validate() {
    let valid = true;
    for (const f of this._fields) {
      if (f.def?.required && (f.state.value === '' || f.state.value == null)) {
        f.setState({ error: 'This field is required' }, false);
        f.redraw();
        valid = false;
      }
    }
    return valid;
  }

  async submit(action, params = {}) {
    if (!this.validate()) return null;
    this.setState({ saving: true }, false);
    const values = this.collectValues();
    try {
      const result = await super.submit(action, { ...values, ...params });
      this.setState({ saving: false, dirty: false }, false);
      return result;
    } catch (e) {
      this.setState({ saving: false }, false);
      throw e;
    }
  }

  draw(container) {
    const { saving = false } = this.state;
    container.innerHTML = `
      <div class="bg-white rounded-xl border border-gray-200 p-6">
        ${this.def.title ? `<h3 class="text-lg font-semibold text-gray-900 mb-5">${esc(this.def.title)}</h3>` : ''}
        ${saving ? `<div class="mb-3 text-sm text-indigo-600 flex items-center gap-2"><span class="animate-spin inline-block">⟳</span> Saving…</div>` : ''}
        <div data-form-fields class="flex flex-col gap-4"></div>
        <div data-form-actions class="flex gap-2 mt-6 pt-5 border-t border-gray-100"></div>
      </div>`;
  }
}

// ─── Button ───────────────────────────────────────────────────────────────────

export class Button extends BaseComponent {
  /**
   * @param {string} id
   * @param {{ loading?: boolean, disabled?: boolean }} state
   * @param {{ label: string, variant?: 'primary'|'secondary'|'danger'|'ghost', action?: string, params?: object }} def
   */
  constructor(id, state, def = {}) {
    super(id, state || {});
    this.def = def;
  }

  draw(container) {
    const { loading = false, disabled = false } = this.state;
    const d = this.def;
    const variantCls = {
      primary:   'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm',
      secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm',
      danger:    'bg-red-600 text-white hover:bg-red-700 border-transparent shadow-sm',
      ghost:     'bg-transparent text-gray-600 border-transparent hover:bg-gray-100',
    }[d.variant] || 'bg-indigo-600 text-white hover:bg-indigo-700 border-transparent shadow-sm';
    const disabledCls = (loading || disabled) ? 'opacity-60 cursor-not-allowed pointer-events-none' : '';

    container.innerHTML = `
      <button class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-md transition-colors ${variantCls} ${disabledCls}" ${(loading || disabled) ? 'disabled' : ''}>
        ${loading ? '<span class="animate-spin">⟳</span>' : ''}
        ${esc(d.label || '')}
      </button>`;

    if (!loading && !disabled) {
      container.querySelector('button').addEventListener('click', () =>
        this.submit(d.action || 'click', d.params || {}));
    }
  }
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

export class StatCard extends BaseComponent {
  draw(container) {
    const { label, value, format = null, delta = null, trend = null, color = 'indigo', icon = null } = this.state;

    let displayValue = value;
    if (format === 'currency') displayValue = fmtCurrency(value);
    else if (format === 'number') displayValue = fmtNumber(value);
    else if (format === 'percent') displayValue = value + '%';

    const borderColors = { green: 'border-green-200', amber: 'border-amber-200', red: 'border-red-200', indigo: 'border-indigo-200', blue: 'border-blue-200' };
    const borderCls = borderColors[color] || 'border-gray-200';

    const trendHtml = trend ? `
      <div class="flex items-center gap-1 mt-1 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}">
        <span>${trend === 'up' ? '↑' : '↓'}</span>
        <span class="text-xs font-medium">${esc(String(delta))}</span>
      </div>` : '';

    container.innerHTML = `
      <div class="bg-white rounded-xl border ${borderCls} p-5 flex flex-col">
        <p class="text-sm font-medium text-gray-500">${esc(label)}</p>
        <p class="mt-2 text-3xl font-bold text-gray-900 tabular-nums">${esc(String(displayValue ?? '—'))}</p>
        ${trendHtml}
      </div>`;
  }
}

// ─── StatRow ──────────────────────────────────────────────────────────────────

export class StatRow extends BaseComponent {
  /**
   * @param {string} id
   * @param {object[]} stats  — each is a StatCard state object
   */
  constructor(id, stats = []) {
    super(id, {});
    this.stats = stats;
  }

  draw(container) {
    this.children = [];
    const cols = this.stats.length;
    const gridCls = cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : cols === 4 ? 'grid-cols-4' : 'grid-cols-2 md:grid-cols-4';
    container.innerHTML = `<div class="grid ${gridCls} gap-4"></div>`;
    const grid = container.querySelector('div');
    this.stats.forEach((stat, i) => {
      const card = new StatCard(`${this.id}-${i}`, stat);
      card.parent = this;
      this.children.push(card);
      const slot = document.createElement('div');
      grid.appendChild(slot);
      card.draw(slot);
    });
  }
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

export class ProgressBar extends BaseComponent {
  draw(container) {
    const { label, value = 0, max = 100, color = 'indigo' } = this.state;
    const pct = Math.min(100, Math.round((value / max) * 100));
    const barCls = { green: 'bg-green-500', teal: 'bg-teal-500', amber: 'bg-amber-500', red: 'bg-red-500', indigo: 'bg-indigo-500', blue: 'bg-blue-500' }[color] || 'bg-indigo-500';
    container.innerHTML = `
      <div class="bg-white rounded-lg border border-gray-200 p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">${esc(label)}</span>
          <span class="text-sm font-semibold text-gray-900">${pct}%</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2.5">
          <div class="${barCls} h-2.5 rounded-full transition-all duration-700" style="width: ${pct}%"></div>
        </div>
      </div>`;
  }
}

// ─── TabPanel ─────────────────────────────────────────────────────────────────

export class TabPanel extends BaseComponent {
  /**
   * @param {string} id
   * @param {{ active?: number }} state
   * @param {Array<{ label: string, render: (container: HTMLElement) => void }>} tabs
   */
  constructor(id, state, tabs = []) {
    super(id, state || { active: 0 });
    this.tabs = tabs;
  }

  draw(container) {
    const { active = 0 } = this.state;

    const tabBtns = this.tabs.map((tab, i) => {
      const isActive = i === active;
      const cls = isActive
        ? 'border-b-2 border-indigo-600 text-indigo-600 font-semibold'
        : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium';
      return `<button data-tab="${i}" class="px-4 py-2.5 text-sm ${cls} transition-colors whitespace-nowrap">${esc(tab.label)}</button>`;
    }).join('');

    container.innerHTML = `
      <div>
        <div class="flex border-b border-gray-200 -mb-px">${tabBtns}</div>
        <div data-tab-content class="pt-4"></div>
      </div>`;

    const content = container.querySelector('[data-tab-content]');
    const currentTab = this.tabs[active];
    if (currentTab?.render) currentTab.render(content);
    else if (currentTab?.content) content.innerHTML = currentTab.content;

    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => this.setState({ active: parseInt(btn.dataset.tab, 10) }));
    });
  }
}

// ─── FilterBar ────────────────────────────────────────────────────────────────

export class FilterBar extends BaseComponent {
  /**
   * @param {string} id
   * @param {{ values?: object }} state
   * @param {Array<{ field: string, label: string, type: 'select'|'search'|'date-range', options?: string[], placeholder?: string }>} filters
   */
  constructor(id, state, filters = []) {
    super(id, state || { values: {} });
    this.filters = filters;
  }

  draw(container) {
    const { values = {} } = this.state;

    const filterHtml = this.filters.map(f => {
      if (f.type === 'select') {
        const opts = (f.options || []).map(o => `<option value="${esc(o)}" ${values[f.field] === o ? 'selected' : ''}>${esc(o)}</option>`).join('');
        return `
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">${esc(f.label)}</label>
            <select data-ff="${esc(f.field)}" class="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[130px]">
              <option value="">All</option>${opts}
            </select>
          </div>`;
      }
      if (f.type === 'search') {
        return `
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">${esc(f.label)}</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-2.5 flex items-center text-gray-400 text-sm">⌕</span>
              <input type="search" data-ff="${esc(f.field)}"
                value="${esc(values[f.field] || '')}"
                placeholder="${esc(f.placeholder || 'Search…')}"
                class="pl-7 pr-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px]"
              />
            </div>
          </div>`;
      }
      if (f.type === 'date-range') {
        return `
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">${esc(f.label)}</label>
            <div class="flex gap-2 items-center">
              <input type="date" data-ff="${esc(f.field + '_from')}" value="${esc(values[f.field + '_from'] || '')}" class="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white" />
              <span class="text-gray-400 text-xs">→</span>
              <input type="date" data-ff="${esc(f.field + '_to')}" value="${esc(values[f.field + '_to'] || '')}" class="px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white" />
            </div>
          </div>`;
      }
      return '';
    }).join('');

    container.innerHTML = `
      <div class="flex flex-wrap gap-4 items-end p-4 bg-white border border-gray-200 rounded-xl">
        ${filterHtml}
        <button data-clear-filters class="self-end px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors">Clear</button>
      </div>`;

    container.querySelectorAll('[data-ff]').forEach(el => {
      el.addEventListener(el.type === 'search' ? 'input' : 'change', e => {
        const newValues = { ...this.state.values, [el.dataset.ff]: e.target.value };
        this.setState({ values: newValues }, false);
        this.submit('filter.change', { values: newValues });
      });
    });

    container.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
      this.setState({ values: {} });
      this.submit('filter.clear', {});
    });
  }
}

// ─── SplitPanel ───────────────────────────────────────────────────────────────

export class SplitPanel extends BaseComponent {
  /**
   * @param {string} id
   * @param {BaseComponent} leftComp
   * @param {BaseComponent} rightComp
   * @param {{ leftWidth?: string, rightWidth?: string }} opts
   */
  constructor(id, leftComp, rightComp, opts = {}) {
    super(id, {});
    this.leftComp = leftComp;
    this.rightComp = rightComp;
    this.opts = opts;
    if (leftComp) { leftComp.parent = this; this.children.push(leftComp); }
    if (rightComp) { rightComp.parent = this; this.children.push(rightComp); }
  }

  draw(container) {
    const lw = this.opts.leftWidth || '2fr';
    const rw = this.opts.rightWidth || '3fr';
    container.innerHTML = `
      <div class="grid gap-6" style="grid-template-columns: ${lw} ${rw}">
        <div data-panel="left"></div>
        <div data-panel="right"></div>
      </div>`;
    if (this.leftComp) this.leftComp.mount(container.querySelector('[data-panel="left"]'));
    if (this.rightComp) this.rightComp.mount(container.querySelector('[data-panel="right"]'));
  }
}
