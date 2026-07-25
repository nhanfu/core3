import { apiFetch, getUser, navigate } from '/tms/app.js';
import { i18n } from '/tms/i18n.js';
import { html } from '/lib/html.js';
import { StatRow } from '/lib/components/StatRow.js';
import { FilterBar } from '/lib/components/FilterBar.js';
import { GridView } from '/lib/components/GridView.js';

// ─── helpers ────────────────────────────────────────────────────────────────

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
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    try {
      await onSave(fields, errorEl);
      overlay.remove();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'flex';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function confirmDelete(label, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  document.body.appendChild(overlay);
  const modal = html.take(overlay).div.className('modal').style('max-width:400px').getContext();
  const mh = html.take(modal).div.className('modal-header').getContext();
  html.take(mh).span.className('modal-title').text('Confirm Delete');
  html.take(mh).button.className('drawer-close').text('✕').event('click', () => overlay.remove());
  const body = html.take(modal).div.className('modal-body').getContext();
  html.take(body).p.style('color:var(--color-text-secondary)').text(label);
  const footer = html.take(modal).div.className('modal-footer').getContext();
  html.take(footer).button.className('btn btn-secondary').text('Cancel').event('click', () => overlay.remove());
  const delBtn = html.take(footer).button.className('btn btn-danger').text('Delete').getContext();
  delBtn.addEventListener('click', async () => {
    delBtn.disabled = true; delBtn.textContent = 'Deleting…';
    try { await onConfirm(); overlay.remove(); } catch { delBtn.disabled = false; delBtn.textContent = 'Delete'; }
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ─── page ───────────────────────────────────────────────────────────────────

export async function mount(container) {
  const user = getUser();
  const canWrite = user?.permissions?.includes('fleet.write');

  let currentPage = 1;
  let currentFilters = {};

  // ── Page header ──────────────────────────────────────────────────────────
  const header = html.take(container).div.className('page-header').getContext();
  html.take(header).div.getContext();
  const titleBlock = html.take(header).div.getContext();
  html.take(titleBlock).div.className('page-title').text(i18n.t('fleet', null, 'Fleet Overview'));
  html.take(titleBlock).div.className('page-subtitle').text(i18n.t('fleet', null, 'Manage your truck fleet'));

  if (canWrite) {
    html.take(header).button
      .className('btn btn-primary')
      .text('+ Add Truck')
      .event('click', () => openAddTruck());
  }

  // ── Stat row ─────────────────────────────────────────────────────────────
  const statsContainer = html.take(container).div.style('margin-bottom:24px').getContext();
  const statRow = new StatRow('fleet-stats', [
    { label: 'Total Trucks',   value: '—', color: 'indigo' },
    { label: 'Active',         value: '—', color: 'green'  },
    { label: 'In Maintenance', value: '—', color: 'amber'  },
    { label: 'Out of Service', value: '—', color: 'red'    },
    { label: 'Service Overdue',value: '—', color: 'red'    },
  ]);
  statRow.mount(statsContainer);

  // ── Filter bar ────────────────────────────────────────────────────────────
  const filterContainer = html.take(container).div.style('margin-bottom:16px').getContext();
  const filterBar = new FilterBar('fleet-filters', { values: {} }, [
    {
      field: 'status', label: 'Status', type: 'select',
      options: ['Active', 'Maintenance', 'Out of Service'],
    },
    {
      field: 'type', label: 'Type', type: 'select',
      options: ['Semi', 'Box Truck', 'Flatbed', 'Refrigerated', 'Tanker'],
    },
    { field: 'q', label: 'Search', type: 'search', placeholder: 'Plate, model…' },
  ]);
  filterBar._onAction = (action, params) => {
    if (action === 'filter.change' || action === 'filter.clear') {
      currentFilters = params.values || {};
      currentPage = 1;
      loadGrid();
    }
  };
  filterBar.mount(filterContainer);

  // ── Grid ──────────────────────────────────────────────────────────────────
  const gridContainer = html.take(container).div.getContext();

  const actions = canWrite
    ? [{ id: 'edit', label: 'Edit', icon: '✏️' }, { id: 'delete', label: 'Delete', icon: '🗑️', variant: 'danger' }]
    : [];

  const grid = new GridView('fleet-grid', { rows: [], meta: { total: 0, page: 1, pageSize: 8 }, loading: true }, [
    { id: 'plate',        type: 'TextCell',   label: 'Plate / Model',   field: 'plate',        secondary: 'model' },
    { id: 'driver',       type: 'TextCell',   label: 'Driver',          field: 'driver_name',  secondary: 'driver_phone' },
    { id: 'status',       type: 'BadgeCell',  label: 'Status',          field: 'status' },
    { id: 'type',         type: 'BadgeCell',  label: 'Type',            field: 'type' },
    { id: 'mileage',      type: 'NumberCell', label: 'Mileage',         field: 'mileage' },
    { id: 'last_service', type: 'DateCell',   label: 'Last Service',    field: 'last_service_date',  format: 'relative' },
    { id: 'next_service', type: 'DateCell',   label: 'Next Service',    field: 'next_service_date',  format: 'relative', overdueField: 'overdue_next' },
    { id: 'actions',      type: 'ActionCell', label: '',                field: 'id',           actions },
  ]);

  grid._onAction = (action, params) => {
    if (action === 'edit')   openEditTruck(params.row);
    if (action === 'delete') openDeleteTruck(params.row);
  };

  grid.mount(gridContainer);

  // Intercept page changes for server-side pagination
  const origGridSetState = grid.setState.bind(grid);
  grid.setState = (partial, redraw = true) => {
    if (partial.meta?.page !== undefined) {
      currentPage = partial.meta.page;
      loadGrid();
    } else {
      origGridSetState(partial, redraw);
    }
  };

  // ── Data loaders ──────────────────────────────────────────────────────────

  async function loadKpis() {
    try {
      const res = await apiFetch('/api/v1/trucks/kpis');
      if (!res.ok) return;
      const kpis = await res.json();
      statRow.setState({});
      statRow.stats = [
        { label: 'Total Trucks',    value: String(kpis.total        ?? 0), color: 'indigo' },
        { label: 'Active',          value: String(kpis.active       ?? 0), color: 'green'  },
        { label: 'In Maintenance',  value: String(kpis.maintenance  ?? 0), color: 'amber'  },
        { label: 'Out of Service',  value: String(kpis.out_of_service ?? 0), color: 'red'  },
        { label: 'Service Overdue', value: String(kpis.service_overdue ?? 0), color: 'red' },
      ];
      statsContainer.innerHTML = '';
      statRow.mount(statsContainer);
    } catch { /* non-fatal */ }
  }

  async function loadGrid() {
    origGridSetState({ loading: true });

    const qs = new URLSearchParams({
      page:     String(currentPage),
      pageSize: '8',
      status:   currentFilters.status || '',
      type:     currentFilters.type   || '',
      q:        currentFilters.q      || '',
    });

    try {
      const res = await apiFetch(`/api/v1/trucks?${qs}`);
      if (!res.ok) throw new Error('Failed to load trucks');
      const data = await res.json();
      origGridSetState({
        rows:    data.rows || data.data || [],
        meta:    { total: data.total ?? 0, page: currentPage, pageSize: 8 },
        loading: false,
      });
    } catch (err) {
      origGridSetState({ rows: [], meta: { total: 0, page: 1, pageSize: 8 }, loading: false });
    }
  }

  // ── Modals ────────────────────────────────────────────────────────────────

  function openAddTruck() {
    openModal('Add Truck', body => {
      const plate       = formField(body, 'License Plate');
      const model       = formField(body, 'Model');
      const type        = formSelect(body, 'Type', ['Semi', 'Box Truck', 'Flatbed', 'Refrigerated', 'Tanker']);
      const mileage     = formField(body, 'Mileage', 'number', '0');
      const next_service = formField(body, 'Next Service Date', 'date');
      const notes       = formField(body, 'Notes');
      return { plate, model, type, mileage, next_service, notes };
    }, async (fields, errorEl) => {
      const body = {
        plate:            fields.plate.value.trim(),
        model:            fields.model.value.trim(),
        type:             fields.type.value,
        mileage:          Number(fields.mileage.value) || 0,
        next_service_date: fields.next_service.value || null,
        notes:            fields.notes.value.trim(),
      };
      if (!body.plate) throw new Error('License plate is required.');
      const res = await apiFetch('/api/v1/trucks', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create truck'); }
      await loadKpis();
      await loadGrid();
    });
  }

  function openEditTruck(row) {
    openModal('Edit Truck', body => {
      const plate        = formField(body, 'License Plate', 'text', row.plate);
      const model        = formField(body, 'Model', 'text', row.model);
      const type         = formSelect(body, 'Type', ['Semi', 'Box Truck', 'Flatbed', 'Refrigerated', 'Tanker'], row.type);
      const status       = formSelect(body, 'Status', ['Active', 'Maintenance', 'Out of Service'], row.status);
      const mileage      = formField(body, 'Mileage', 'number', row.mileage ?? 0);
      const next_service = formField(body, 'Next Service Date', 'date', row.next_service_date ? row.next_service_date.slice(0, 10) : '');
      const notes        = formField(body, 'Notes', 'text', row.notes ?? '');
      return { plate, model, type, status, mileage, next_service, notes };
    }, async (fields, errorEl) => {
      const body = {
        plate:             fields.plate.value.trim(),
        model:             fields.model.value.trim(),
        type:              fields.type.value,
        status:            fields.status.value,
        mileage:           Number(fields.mileage.value) || 0,
        next_service_date: fields.next_service.value || null,
        notes:             fields.notes.value.trim(),
      };
      if (!body.plate) throw new Error('License plate is required.');
      const res = await apiFetch(`/api/v1/trucks/${row.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to update truck'); }
      await loadKpis();
      await loadGrid();
    });
  }

  function openDeleteTruck(row) {
    confirmDelete(
      `Delete truck "${row.plate}"? This action cannot be undone.`,
      async () => {
        const res = await apiFetch(`/api/v1/trucks/${row.id}`, { method: 'DELETE' });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to delete truck'); }
        await loadKpis();
        await loadGrid();
      }
    );
  }

  // ── Initial load ──────────────────────────────────────────────────────────
  await Promise.all([loadKpis(), loadGrid()]);
}
