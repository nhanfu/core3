import { apiFetch, getUser } from '/tms/app.js';
import { i18n } from '/tms/i18n.js';
import { html } from '/lib/html.js';
import { StatRow } from '/lib/components/StatRow.js';
import { FilterBar } from '/lib/components/FilterBar.js';
import { GridView } from '/lib/components/GridView.js';

// ── Form helpers ────────────────────────────────────────────────────────────

function formField(container, label, type = 'text', defaultValue = '') {
  const g = html.take(container).div.className('form-group').getContext();
  html.take(g).label.className('form-label').text(label);
  const input = html.take(g).input.type(type).className('form-input').getContext();
  if (defaultValue !== '' && defaultValue != null) input.value = String(defaultValue);
  return input;
}

function formSelect(container, label, options, defaultValue = '') {
  const g = html.take(container).div.className('form-group').getContext();
  html.take(g).label.className('form-label').text(label);
  const sel = html.take(g).select.className('form-select').getContext();
  for (const opt of options) {
    const val = typeof opt === 'object' ? opt.value : opt;
    const lbl = typeof opt === 'object' ? opt.label : opt;
    const o = html.take(sel).option.value(val).text(lbl).getContext();
    if (val === defaultValue) o.setAttribute('selected', '');
  }
  return sel;
}

function openModal(title, buildBodyFn, onSave) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  document.body.appendChild(overlay);
  const modal = html.take(overlay).div.className('modal').getContext();
  const mh = html.take(modal).div.className('modal-header').getContext();
  html.take(mh).span.className('modal-title').text(title);
  html.take(mh).button.className('drawer-close').text('✕').event('click', () => overlay.remove());
  const body = html.take(modal).div.className('modal-body').getContext();
  const errorEl = html.take(body).div.className('alert alert-error').style('display:none;margin-bottom:12px').getContext();
  const fields = buildBodyFn(body);
  const footer = html.take(modal).div.className('modal-footer').getContext();
  html.take(footer).button.className('btn btn-secondary').text('Cancel').event('click', () => overlay.remove());
  const saveBtn = html.take(footer).button.className('btn btn-primary').text('Save').getContext();
  saveBtn.addEventListener('click', async () => {
    errorEl.style.display = 'none';
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try { await onSave(fields, errorEl); overlay.remove(); }
    catch (err) { errorEl.textContent = err.message; errorEl.style.display = 'flex'; saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function confirmDelete(label, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  document.body.appendChild(overlay);
  const modal = html.take(overlay).div.className('modal').style('max-width:400px').getContext();
  const mh = html.take(modal).div.className('modal-header').getContext();
  html.take(mh).span.className('modal-title').text('Confirm');
  html.take(mh).button.className('drawer-close').text('✕').event('click', () => overlay.remove());
  const body = html.take(modal).div.className('modal-body').getContext();
  html.take(body).p.style('color:var(--color-text-secondary)').text(label);
  const footer = html.take(modal).div.className('modal-footer').getContext();
  html.take(footer).button.className('btn btn-secondary').text('Cancel').event('click', () => overlay.remove());
  const delBtn = html.take(footer).button.className('btn btn-danger').text('Confirm').getContext();
  delBtn.addEventListener('click', async () => {
    delBtn.disabled = true; delBtn.textContent = 'Processing…';
    try { await onConfirm(); overlay.remove(); } catch { delBtn.disabled = false; delBtn.textContent = 'Confirm'; }
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ── Constants ───────────────────────────────────────────────────────────────

const SERVICE_TYPES = ['Oil Change', 'Inspection', 'Tire', 'Brake', 'Engine', 'Body'];
const STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Overdue'];

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Page module ─────────────────────────────────────────────────────────────

export async function mount(container) {
  const user = getUser();
  const canWrite = user?.permissions?.includes('maintenance.write');

  // Page header
  const header = html.take(container).div.className('page-header').getContext();
  html.take(header).h1.className('page-title').text(i18n.t('maintenance', null, 'Maintenance'));
  html.take(header).p.className('page-subtitle').text('Track and manage vehicle maintenance records');
  if (canWrite) {
    const addBtn = html.take(header).button.className('btn btn-primary').text('+ Schedule Service').getContext();
    addBtn.addEventListener('click', () => openAddModal());
  }

  // StatRow — placeholder values until KPIs load
  const statEl = html.take(container).div.style('margin-top:16px').getContext();
  const statRow = new StatRow('maint-stats', [
    { label: 'Overdue', value: '–', color: 'red' },
    { label: 'Due This Week', value: '–', color: 'amber' },
    { label: 'In Progress', value: '–', color: 'blue' },
    { label: 'Completed This Month', value: '–', color: 'green' },
  ]);
  statRow.mount(statEl);

  // FilterBar
  const filterEl = html.take(container).div.style('margin-top:16px').getContext();
  let filterValues = {};
  const filterBar = new FilterBar('maint-filter', { values: {} }, [
    { field: 'service_type', label: 'Service Type', type: 'select', options: SERVICE_TYPES },
    { field: 'status', label: 'Status', type: 'select', options: STATUSES },
    { field: 'q', label: 'Search', type: 'search', placeholder: 'Truck plate or notes…' },
  ]);

  // GridView
  const gridEl = html.take(container).div.style('margin-top:16px').getContext();
  let currentPage = 1;
  const pageSize = 8;

  const writeActions = [
    { id: 'edit', label: 'Edit', variant: 'primary' },
    { id: 'mark_done', label: 'Mark Done', variant: 'ghost' },
    { id: 'delete', label: 'Delete', variant: 'danger' },
  ];

  const columnDefs = [
    { id: 'truck', type: 'TextCell', field: 'truck_plate', label: 'Truck', secondary: 'truck_model' },
    { id: 'service_type', type: 'BadgeCell', field: 'service_type', label: 'Service Type' },
    { id: 'status', type: 'BadgeCell', field: 'status', label: 'Status' },
    { id: 'scheduled_date', type: 'DateCell', field: 'scheduled_date', label: 'Scheduled Date', format: 'short' },
    { id: 'completed_date', type: 'DateCell', field: 'completed_date', label: 'Completed Date', format: 'short' },
    { id: 'cost', type: 'NumberCell', field: 'cost', label: 'Cost', format: '#,###' },
    { id: 'technician', type: 'TextCell', field: 'technician_name', label: 'Technician' },
    ...(canWrite ? [{ id: 'actions', type: 'ActionCell', field: '', label: '', actions: writeActions }] : []),
  ];

  const grid = new GridView('maint-grid', { rows: [], meta: { total: 0, page: 1, pageSize }, loading: true }, columnDefs);

  // Server-side pagination override
  const origSetState = grid.setState.bind(grid);
  grid.setState = (partial, redraw = true) => {
    if (partial.meta?.page !== undefined) {
      currentPage = partial.meta.page;
      loadGrid();
    } else {
      origSetState(partial, redraw);
    }
  };

  // Unified action handler (shared by filterBar and grid)
  function onAction(action, params) {
    if (action === 'filter.change') {
      filterValues = params.values;
      currentPage = 1;
      loadGrid();
    } else if (action === 'filter.clear') {
      filterValues = {};
      currentPage = 1;
      loadGrid();
    } else if (action === 'edit') {
      openEditModal(params.row);
    } else if (action === 'mark_done') {
      const row = params.row;
      if (row.status === 'Completed') return;
      confirmDelete(
        `Mark "${row.service_type}" for ${row.truck_plate} as completed?`,
        async () => {
          const res = await apiFetch(`/api/v1/maintenance/${row.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'Completed', completed_date: today() }),
          });
          if (!res.ok) throw new Error('Failed to update record');
          loadGrid();
          loadKpis();
        }
      );
    } else if (action === 'delete') {
      const row = params.row;
      confirmDelete(
        `Delete maintenance record for ${row.truck_plate} (${row.service_type})?`,
        async () => {
          const res = await apiFetch(`/api/v1/maintenance/${row.id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Failed to delete record');
          loadGrid();
          loadKpis();
        }
      );
    }
  }

  filterBar._onAction = onAction;
  grid._onAction = onAction;

  filterBar.mount(filterEl);
  grid.mount(gridEl);

  // ── Data loaders ────────────────────────────────────────────────────────

  async function loadKpis() {
    try {
      const res = await apiFetch('/api/v1/maintenance/kpis');
      if (!res.ok) return;
      const kpi = await res.json();
      statRow.stats = [
        { label: 'Overdue', value: kpi.overdue ?? 0, color: 'red' },
        { label: 'Due This Week', value: kpi.due_this_week ?? 0, color: 'amber' },
        { label: 'In Progress', value: kpi.in_progress ?? 0, color: 'blue' },
        { label: 'Completed This Month', value: kpi.completed_month ?? 0, color: 'green' },
      ];
      statRow.redraw();
    } catch {}
  }

  async function loadGrid() {
    origSetState({ loading: true }, true);
    try {
      const params = new URLSearchParams({ page: String(currentPage), pageSize: String(pageSize) });
      if (filterValues.status)       params.set('status', filterValues.status);
      if (filterValues.service_type) params.set('service_type', filterValues.service_type);
      if (filterValues.q)            params.set('q', filterValues.q);

      const res = await apiFetch(`/api/v1/maintenance?${params}`);
      if (!res.ok) throw new Error('Failed to load maintenance records');
      const data = await res.json();

      const rows = Array.isArray(data) ? data : (data.rows ?? data.data ?? []);
      const meta = Array.isArray(data)
        ? { total: data.length, page: currentPage, pageSize }
        : (data.meta ?? { total: rows.length, page: currentPage, pageSize });

      origSetState({ rows, meta, loading: false }, true);
    } catch {
      origSetState({ rows: [], meta: { total: 0, page: currentPage, pageSize }, loading: false }, true);
    }
  }

  // ── Modals ──────────────────────────────────────────────────────────────

  function openAddModal() {
    openModal('Schedule Service', (body) => {
      const truckId      = formField(body, 'Truck ID (UUID)', 'text');
      const serviceType  = formSelect(body, 'Service Type', SERVICE_TYPES);
      const scheduledDate = formField(body, 'Scheduled Date', 'date');
      const cost         = formField(body, 'Cost', 'number');
      const notes        = formField(body, 'Notes', 'text');
      return { truckId, serviceType, scheduledDate, cost, notes };
    }, async (fields) => {
      const res = await apiFetch('/api/v1/maintenance', {
        method: 'POST',
        body: JSON.stringify({
          truck_id:       fields.truckId.value.trim(),
          service_type:   fields.serviceType.value,
          scheduled_date: fields.scheduledDate.value,
          cost:           Number(fields.cost.value) || 0,
          notes:          fields.notes.value.trim(),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to schedule service');
      }
      loadGrid();
      loadKpis();
    });
  }

  function openEditModal(row) {
    openModal('Edit Maintenance Record', (body) => {
      const truckId       = formField(body, 'Truck ID (UUID)', 'text', row.truck_id ?? '');
      const serviceType   = formSelect(body, 'Service Type', SERVICE_TYPES, row.service_type ?? '');
      const status        = formSelect(body, 'Status', STATUSES, row.status ?? '');
      const scheduledDate = formField(body, 'Scheduled Date', 'date', row.scheduled_date ?? '');
      const completedDate = formField(body, 'Completed Date', 'date', row.completed_date ?? '');
      const cost          = formField(body, 'Cost', 'number', row.cost ?? '');
      const notes         = formField(body, 'Notes', 'text', row.notes ?? '');
      return { truckId, serviceType, status, scheduledDate, completedDate, cost, notes };
    }, async (fields) => {
      const res = await apiFetch(`/api/v1/maintenance/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          truck_id:        fields.truckId.value.trim(),
          service_type:    fields.serviceType.value,
          status:          fields.status.value,
          scheduled_date:  fields.scheduledDate.value,
          completed_date:  fields.completedDate.value || null,
          cost:            Number(fields.cost.value) || 0,
          notes:           fields.notes.value.trim(),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to update record');
      }
      loadGrid();
      loadKpis();
    });
  }

  // Initial load
  loadKpis();
  loadGrid();
}
