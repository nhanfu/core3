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
  html.take(mh).span.className('modal-title').text('Confirm Cancel');
  html.take(mh).button.className('drawer-close').text('✕').event('click', () => overlay.remove());
  const body = html.take(modal).div.className('modal-body').getContext();
  html.take(body).p.style('color:var(--color-text-secondary)').text(label);
  const footer = html.take(modal).div.className('modal-footer').getContext();
  html.take(footer).button.className('btn btn-secondary').text('Back').event('click', () => overlay.remove());
  const delBtn = html.take(footer).button.className('btn btn-danger').text('Cancel Trip').getContext();
  delBtn.addEventListener('click', async () => {
    delBtn.disabled = true; delBtn.textContent = 'Cancelling…';
    try { await onConfirm(); overlay.remove(); } catch { delBtn.disabled = false; delBtn.textContent = 'Cancel Trip'; }
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ─── page ───────────────────────────────────────────────────────────────────

export async function mount(container) {
  const user = getUser();
  const canWrite = user?.permissions?.includes('trips.write');

  let currentPage = 1;
  let currentFilters = {};

  // ── Page header ──────────────────────────────────────────────────────────
  const header = html.take(container).div.className('page-header').getContext();
  const titleBlock = html.take(header).div.getContext();
  html.take(titleBlock).div.className('page-title').text(i18n.t('trips', null, 'Trip Management'));
  html.take(titleBlock).div.className('page-subtitle').text(i18n.t('trips', null, 'Plan and track all trips'));

  if (canWrite) {
    html.take(header).button
      .className('btn btn-primary')
      .text('+ Add Trip')
      .event('click', () => openAddTrip());
  }

  // ── Stat row ─────────────────────────────────────────────────────────────
  const statsContainer = html.take(container).div.style('margin-bottom:24px').getContext();
  const statRow = new StatRow('trips-stats', [
    { label: 'Scheduled',       value: '—', color: 'indigo' },
    { label: 'In Transit',      value: '—', color: 'blue'   },
    { label: 'Completed Today', value: '—', color: 'green'  },
    { label: 'Cancelled',       value: '—', color: 'red'    },
  ]);
  statRow.mount(statsContainer);

  // ── Filter bar ────────────────────────────────────────────────────────────
  const filterContainer = html.take(container).div.style('margin-bottom:16px').getContext();
  const filterBar = new FilterBar('trips-filters', { values: {} }, [
    {
      field: 'status', label: 'Status', type: 'select',
      options: ['Scheduled', 'In Transit', 'Completed', 'Cancelled'],
    },
    { field: 'q', label: 'Search', type: 'search', placeholder: 'Trip #, truck, driver…' },
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
    ? [{ id: 'edit', label: 'Edit', icon: '✏️' }, { id: 'cancel', label: 'Cancel', icon: '✕', variant: 'danger' }]
    : [];

  const grid = new GridView('trips-grid', { rows: [], meta: { total: 0, page: 1, pageSize: 8 }, loading: true }, [
    { id: 'trip_number',  type: 'TextCell',   label: 'Trip #',       field: 'trip_number',   secondary: 'cargo_type' },
    { id: 'truck_driver', type: 'TextCell',   label: 'Truck / Driver', field: 'truck_plate', secondary: 'driver_name' },
    { id: 'route',        type: 'TextCell',   label: 'Route',        field: 'origin',         secondary: 'destination' },
    { id: 'status',       type: 'BadgeCell',  label: 'Status',       field: 'status' },
    { id: 'departure',    type: 'DateCell',   label: 'Departure',    field: 'departure_time', format: 'short' },
    { id: 'arrival',      type: 'DateCell',   label: 'Arrival',      field: 'arrival_time',   format: 'short' },
    { id: 'distance_km',  type: 'NumberCell', label: 'Distance (km)', field: 'distance_km' },
    { id: 'actions',      type: 'ActionCell', label: '',             field: 'id',             actions },
  ]);

  grid._onAction = (action, params) => {
    if (action === 'edit')   openEditTrip(params.row);
    if (action === 'cancel') openCancelTrip(params.row);
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

  async function loadStats() {
    try {
      const res = await apiFetch('/api/v1/trips/stats');
      if (!res.ok) return;
      const s = await res.json();
      statRow.stats = [
        { label: 'Scheduled',       value: String(s.scheduled        ?? 0), color: 'indigo' },
        { label: 'In Transit',      value: String(s.in_transit       ?? 0), color: 'blue'   },
        { label: 'Completed Today', value: String(s.completed_today  ?? 0), color: 'green'  },
        { label: 'Cancelled',       value: String(s.cancelled        ?? 0), color: 'red'    },
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
      q:        currentFilters.q      || '',
    });

    try {
      const res = await apiFetch(`/api/v1/trips?${qs}`);
      if (!res.ok) throw new Error('Failed to load trips');
      const data = await res.json();
      origGridSetState({
        rows:    data.rows || data.data || [],
        meta:    { total: data.total ?? 0, page: currentPage, pageSize: 8 },
        loading: false,
      });
    } catch {
      origGridSetState({ rows: [], meta: { total: 0, page: 1, pageSize: 8 }, loading: false });
    }
  }

  // ── Modals ────────────────────────────────────────────────────────────────

  function openAddTrip() {
    openModal('Add Trip', body => {
      const origin         = formField(body, 'Origin');
      const destination    = formField(body, 'Destination');
      const departure_time = formField(body, 'Departure Time', 'datetime-local');
      const arrival_time   = formField(body, 'Arrival Time', 'datetime-local');
      const distance_km    = formField(body, 'Distance (km)', 'number', '0');
      const cargo_type     = formField(body, 'Cargo Type');
      const cargo_weight   = formField(body, 'Cargo Weight (kg)', 'number', '0');
      const truck_id       = formField(body, 'Truck ID (UUID)');
      const driver_id      = formField(body, 'Driver ID (UUID)');
      const notes          = formField(body, 'Notes');
      return { origin, destination, departure_time, arrival_time, distance_km, cargo_type, cargo_weight, truck_id, driver_id, notes };
    }, async (fields) => {
      const body = {
        origin:         fields.origin.value.trim(),
        destination:    fields.destination.value.trim(),
        departure_time: fields.departure_time.value || null,
        arrival_time:   fields.arrival_time.value   || null,
        distance_km:    Number(fields.distance_km.value)  || 0,
        cargo_type:     fields.cargo_type.value.trim(),
        cargo_weight:   Number(fields.cargo_weight.value) || 0,
        truck_id:       fields.truck_id.value.trim()  || null,
        driver_id:      fields.driver_id.value.trim() || null,
        notes:          fields.notes.value.trim(),
      };
      if (!body.origin)      throw new Error('Origin is required.');
      if (!body.destination) throw new Error('Destination is required.');
      const res = await apiFetch('/api/v1/trips', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create trip'); }
      await loadStats();
      await loadGrid();
    });
  }

  function openEditTrip(row) {
    const toLocalDT = val => {
      if (!val) return '';
      // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:MM)
      return val.slice(0, 16);
    };

    openModal('Edit Trip', body => {
      const origin         = formField(body, 'Origin', 'text', row.origin ?? '');
      const destination    = formField(body, 'Destination', 'text', row.destination ?? '');
      const departure_time = formField(body, 'Departure Time', 'datetime-local', toLocalDT(row.departure_time));
      const arrival_time   = formField(body, 'Arrival Time', 'datetime-local', toLocalDT(row.arrival_time));
      const distance_km    = formField(body, 'Distance (km)', 'number', row.distance_km ?? 0);
      const cargo_type     = formField(body, 'Cargo Type', 'text', row.cargo_type ?? '');
      const cargo_weight   = formField(body, 'Cargo Weight (kg)', 'number', row.cargo_weight ?? 0);
      const truck_id       = formField(body, 'Truck ID (UUID)', 'text', row.truck_id ?? '');
      const driver_id      = formField(body, 'Driver ID (UUID)', 'text', row.driver_id ?? '');
      const status         = formSelect(body, 'Status', ['Scheduled', 'In Transit', 'Completed', 'Cancelled'], row.status ?? 'Scheduled');
      const notes          = formField(body, 'Notes', 'text', row.notes ?? '');
      return { origin, destination, departure_time, arrival_time, distance_km, cargo_type, cargo_weight, truck_id, driver_id, status, notes };
    }, async (fields) => {
      const body = {
        origin:         fields.origin.value.trim(),
        destination:    fields.destination.value.trim(),
        departure_time: fields.departure_time.value || null,
        arrival_time:   fields.arrival_time.value   || null,
        distance_km:    Number(fields.distance_km.value)  || 0,
        cargo_type:     fields.cargo_type.value.trim(),
        cargo_weight:   Number(fields.cargo_weight.value) || 0,
        truck_id:       fields.truck_id.value.trim()  || null,
        driver_id:      fields.driver_id.value.trim() || null,
        status:         fields.status.value,
        notes:          fields.notes.value.trim(),
      };
      if (!body.origin)      throw new Error('Origin is required.');
      if (!body.destination) throw new Error('Destination is required.');
      const res = await apiFetch(`/api/v1/trips/${row.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to update trip'); }
      await loadStats();
      await loadGrid();
    });
  }

  function openCancelTrip(row) {
    confirmDelete(
      `Cancel trip "${row.trip_number || row.id}"? The trip status will be set to Cancelled.`,
      async () => {
        const res = await apiFetch(`/api/v1/trips/${row.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'Cancelled' }),
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to cancel trip'); }
        await loadStats();
        await loadGrid();
      }
    );
  }

  // ── Initial load ──────────────────────────────────────────────────────────
  await Promise.all([loadStats(), loadGrid()]);
}
