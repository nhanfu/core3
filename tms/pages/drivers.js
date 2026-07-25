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
  const canWrite = user?.permissions?.includes('drivers.write');

  let currentPage = 1;
  let currentFilters = {};

  // ── Page header ──────────────────────────────────────────────────────────
  const header = html.take(container).div.className('page-header').getContext();
  const titleBlock = html.take(header).div.getContext();
  html.take(titleBlock).div.className('page-title').text(i18n.t('drivers', null, 'Drivers'));
  html.take(titleBlock).div.className('page-subtitle').text(i18n.t('drivers', null, 'Manage your driver workforce'));

  if (canWrite) {
    html.take(header).button
      .className('btn btn-primary')
      .text('+ Add Driver')
      .event('click', () => openAddDriver());
  }

  // ── Stat row ─────────────────────────────────────────────────────────────
  const statsContainer = html.take(container).div.style('margin-bottom:24px').getContext();
  const statRow = new StatRow('drivers-stats', [
    { label: 'Total Drivers',      value: '—', color: 'indigo' },
    { label: 'Active',             value: '—', color: 'green'  },
    { label: 'On Leave',           value: '—', color: 'amber'  },
    { label: 'Expiring License',   value: '—', color: 'red'    },
  ]);
  statRow.mount(statsContainer);

  // ── Filter bar ────────────────────────────────────────────────────────────
  const filterContainer = html.take(container).div.style('margin-bottom:16px').getContext();
  const filterBar = new FilterBar('drivers-filters', { values: {} }, [
    {
      field: 'status', label: 'Status', type: 'select',
      options: ['Active', 'On Leave', 'Suspended'],
    },
    { field: 'q', label: 'Search', type: 'search', placeholder: 'Name or license…' },
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

  const grid = new GridView('drivers-grid', { rows: [], meta: { total: 0, page: 1, pageSize: 8 }, loading: true }, [
    { id: 'name',           type: 'TextCell',  label: 'Name',           field: 'name',           secondary: 'email' },
    { id: 'status',         type: 'BadgeCell', label: 'Status',         field: 'status' },
    { id: 'license_number', type: 'TextCell',  label: 'License #',      field: 'license_number' },
    { id: 'license_expiry', type: 'DateCell',  label: 'License Expiry', field: 'license_expiry', format: 'short', overdueField: 'license_overdue' },
    { id: 'truck_plate',    type: 'TextCell',  label: 'Truck',          field: 'truck_plate' },
    { id: 'actions',        type: 'ActionCell', label: '',              field: 'id',             actions },
  ]);

  grid._onAction = (action, params) => {
    if (action === 'edit')   openEditDriver(params.row);
    if (action === 'delete') openDeleteDriver(params.row);
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
      const res = await apiFetch('/api/v1/drivers/stats');
      if (!res.ok) return;
      const s = await res.json();
      statRow.stats = [
        { label: 'Total Drivers',    value: String(s.total            ?? 0), color: 'indigo' },
        { label: 'Active',           value: String(s.active           ?? 0), color: 'green'  },
        { label: 'On Leave',         value: String(s.on_leave         ?? 0), color: 'amber'  },
        { label: 'Expiring License', value: String(s.expiring_license ?? 0), color: 'red'    },
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
      const res = await apiFetch(`/api/v1/drivers?${qs}`);
      if (!res.ok) throw new Error('Failed to load drivers');
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

  function openAddDriver() {
    openModal('Add Driver', body => {
      const name           = formField(body, 'Full Name');
      const phone          = formField(body, 'Phone', 'tel');
      const email          = formField(body, 'Email', 'email');
      const license_number = formField(body, 'License Number');
      const license_expiry = formField(body, 'License Expiry', 'date');
      const status         = formSelect(body, 'Status', ['Active', 'On Leave', 'Suspended'], 'Active');
      return { name, phone, email, license_number, license_expiry, status };
    }, async (fields) => {
      const body = {
        name:           fields.name.value.trim(),
        phone:          fields.phone.value.trim(),
        email:          fields.email.value.trim(),
        license_number: fields.license_number.value.trim(),
        license_expiry: fields.license_expiry.value || null,
        status:         fields.status.value,
      };
      if (!body.name) throw new Error('Name is required.');
      if (!body.license_number) throw new Error('License number is required.');
      const res = await apiFetch('/api/v1/drivers', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to create driver'); }
      await loadStats();
      await loadGrid();
    });
  }

  function openEditDriver(row) {
    openModal('Edit Driver', body => {
      const name              = formField(body, 'Full Name', 'text', row.name);
      const phone             = formField(body, 'Phone', 'tel', row.phone ?? '');
      const email             = formField(body, 'Email', 'email', row.email ?? '');
      const license_number    = formField(body, 'License Number', 'text', row.license_number ?? '');
      const license_expiry    = formField(body, 'License Expiry', 'date', row.license_expiry ? row.license_expiry.slice(0, 10) : '');
      const status            = formSelect(body, 'Status', ['Active', 'On Leave', 'Suspended'], row.status ?? 'Active');
      const assigned_truck_id = formField(body, 'Assigned Truck ID (optional)', 'text', row.assigned_truck_id ?? '');
      return { name, phone, email, license_number, license_expiry, status, assigned_truck_id };
    }, async (fields) => {
      const body = {
        name:              fields.name.value.trim(),
        phone:             fields.phone.value.trim(),
        email:             fields.email.value.trim(),
        license_number:    fields.license_number.value.trim(),
        license_expiry:    fields.license_expiry.value || null,
        status:            fields.status.value,
        assigned_truck_id: fields.assigned_truck_id.value.trim() || null,
      };
      if (!body.name) throw new Error('Name is required.');
      const res = await apiFetch(`/api/v1/drivers/${row.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to update driver'); }
      await loadStats();
      await loadGrid();
    });
  }

  function openDeleteDriver(row) {
    confirmDelete(
      `Delete driver "${row.name}"? This action cannot be undone.`,
      async () => {
        const res = await apiFetch(`/api/v1/drivers/${row.id}`, { method: 'DELETE' });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to delete driver'); }
        await loadStats();
        await loadGrid();
      }
    );
  }

  // ── Initial load ──────────────────────────────────────────────────────────
  await Promise.all([loadStats(), loadGrid()]);
}
