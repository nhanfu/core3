import { apiFetch, getUser } from '/tms/app.js';
import { i18n } from '/tms/i18n.js';
import { html } from '/lib/html.js';
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

function confirmAction(label, onConfirm) {
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
  const confirmBtn = html.take(footer).button.className('btn btn-danger').text('Confirm').getContext();
  confirmBtn.addEventListener('click', async () => {
    confirmBtn.disabled = true; confirmBtn.textContent = 'Processing…';
    try { await onConfirm(); overlay.remove(); } catch { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm'; }
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ── Page module ─────────────────────────────────────────────────────────────

const ROLES_LIST = ['admin', 'fleet_manager', 'dispatcher', 'mechanic'];
const BRANCH_STATUSES = ['Active', 'Inactive'];
const I18N_LANGS = ['en', 'vi'];
const I18N_PAGES = ['*', 'fleet', 'drivers', 'trips', 'maintenance', 'reports', 'settings', 'login'];

export async function mount(container) {
  const user = getUser();
  const canWrite = user?.permissions?.includes('settings.write');

  // Page header
  const header = html.take(container).div.className('page-header').getContext();
  html.take(header).h1.className('page-title').text(i18n.t('settings', null, 'Settings'));
  html.take(header).p.className('page-subtitle').text('Manage branches, users, roles and translations');

  // Tab bar + content area
  let activeTab = 'branches';
  const tabContainer = html.take(container).div
    .style('display:flex;gap:0;border-bottom:1px solid var(--color-border,#e5e7eb);margin-top:16px')
    .getContext();
  const contentContainer = html.take(container).div.style('margin-top:20px').getContext();

  const ALL_TABS = [
    { id: 'branches',     label: 'Branches' },
    { id: 'users',        label: 'Users' },
    { id: 'roles',        label: 'Roles' },
    { id: 'translations', label: 'Translations' },
  ];

  function renderTabs() {
    tabContainer.innerHTML = '';
    for (const tab of ALL_TABS) {
      const isActive = activeTab === tab.id;
      html.take(tabContainer).button
        .className(`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`)
        .text(tab.label)
        .event('click', () => switchTab(tab.id));
    }
  }

  async function switchTab(tabId) {
    activeTab = tabId;
    renderTabs();
    contentContainer.innerHTML = '';
    if (tabId === 'branches')     await loadBranches();
    else if (tabId === 'users')   await loadUsers();
    else if (tabId === 'roles')   await loadRoles();
    else if (tabId === 'translations') await loadTranslations();
  }

  // ── Branches ─────────────────────────────────────────────────────────

  async function loadBranches() {
    // Toolbar
    if (canWrite) {
      const toolbar = html.take(contentContainer).div.style('display:flex;justify-content:flex-end;margin-bottom:12px').getContext();
      html.take(toolbar).button.className('btn btn-primary btn-sm').text('+ Add Branch')
        .event('click', () => openAddBranchModal(refreshBranches));
    }

    const gridEl = html.take(contentContainer).div.getContext();

    async function refreshBranches() {
      try {
        const res = await apiFetch('/api/v1/branches');
        if (!res.ok) throw new Error('Failed to load branches');
        const rows = await res.json();

        const writeActions = canWrite
          ? [
              { id: 'edit', label: 'Edit', variant: 'primary' },
              { id: 'deactivate', label: 'Deactivate', variant: 'danger' },
            ]
          : [];

        gridEl.innerHTML = '';
        const grid = new GridView('branches-grid', { rows: Array.isArray(rows) ? rows : [], meta: null }, [
          { id: 'name',        type: 'TextCell',   field: 'name',        label: 'Name',   secondary: 'city' },
          { id: 'region',      type: 'TextCell',   field: 'region',      label: 'Region' },
          { id: 'status',      type: 'BadgeCell',   field: 'status',      label: 'Status' },
          { id: 'truck_count', type: 'NumberCell',  field: 'truck_count', label: 'Trucks' },
          ...(canWrite ? [{ id: 'actions', type: 'ActionCell', field: '', label: '', actions: writeActions }] : []),
        ]);
        grid._onAction = (action, params) => {
          const row = params.row;
          if (action === 'edit') {
            openEditBranchModal(row, refreshBranches);
          } else if (action === 'deactivate') {
            confirmAction(`Deactivate branch "${row.name}"?`, async () => {
              const r = await apiFetch(`/api/v1/branches/${row.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'Inactive' }),
              });
              if (!r.ok) throw new Error('Failed to deactivate branch');
              refreshBranches();
            });
          }
        };
        grid.mount(gridEl);
      } catch (err) {
        gridEl.innerHTML = '';
        html.take(gridEl).div.className('alert alert-error').text(err.message);
      }
    }

    await refreshBranches();
  }

  function openAddBranchModal(onDone) {
    openModal('Add Branch', (body) => {
      const name   = formField(body, 'Name', 'text');
      const city   = formField(body, 'City', 'text');
      const region = formField(body, 'Region', 'text');
      const status = formSelect(body, 'Status', BRANCH_STATUSES, 'Active');
      return { name, city, region, status };
    }, async (fields) => {
      const res = await apiFetch('/api/v1/branches', {
        method: 'POST',
        body: JSON.stringify({
          name:   fields.name.value.trim(),
          city:   fields.city.value.trim(),
          region: fields.region.value.trim(),
          status: fields.status.value,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to create branch');
      }
      onDone();
    });
  }

  function openEditBranchModal(row, onDone) {
    openModal('Edit Branch', (body) => {
      const name   = formField(body, 'Name',   'text', row.name   ?? '');
      const city   = formField(body, 'City',   'text', row.city   ?? '');
      const region = formField(body, 'Region', 'text', row.region ?? '');
      const status = formSelect(body, 'Status', BRANCH_STATUSES, row.status ?? 'Active');
      return { name, city, region, status };
    }, async (fields) => {
      const res = await apiFetch(`/api/v1/branches/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name:   fields.name.value.trim(),
          city:   fields.city.value.trim(),
          region: fields.region.value.trim(),
          status: fields.status.value,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to update branch');
      }
      onDone();
    });
  }

  // ── Users ─────────────────────────────────────────────────────────────

  async function loadUsers() {
    if (canWrite) {
      const toolbar = html.take(contentContainer).div.style('display:flex;justify-content:flex-end;margin-bottom:12px').getContext();
      html.take(toolbar).button.className('btn btn-primary btn-sm').text('+ Invite User')
        .event('click', () => openInviteUserModal(refreshUsers));
    }

    const gridEl = html.take(contentContainer).div.getContext();

    async function refreshUsers() {
      try {
        const res = await apiFetch('/api/v1/users');
        if (!res.ok) throw new Error('Failed to load users');
        const rawRows = await res.json();
        // Join roles array into string for TextCell display
        const rows = (Array.isArray(rawRows) ? rawRows : []).map(u => ({
          ...u,
          roles_display: Array.isArray(u.roles) ? u.roles.join(', ') : String(u.roles ?? ''),
        }));

        const writeActions = canWrite
          ? [{ id: 'edit', label: 'Edit', variant: 'primary' }]
          : [];

        gridEl.innerHTML = '';
        const grid = new GridView('users-grid', { rows, meta: null }, [
          { id: 'name',     type: 'TextCell', field: 'name',           label: 'Name',     secondary: 'email' },
          { id: 'roles',    type: 'TextCell', field: 'roles_display',  label: 'Roles' },
          { id: 'lang',     type: 'TextCell', field: 'preferred_lang', label: 'Language' },
          ...(canWrite ? [{ id: 'actions', type: 'ActionCell', field: '', label: '', actions: writeActions }] : []),
        ]);
        grid._onAction = (action, params) => {
          const row = params.row;
          if (action === 'edit') openEditUserModal(row, refreshUsers);
        };
        grid.mount(gridEl);
      } catch (err) {
        gridEl.innerHTML = '';
        html.take(gridEl).div.className('alert alert-error').text(err.message);
      }
    }

    await refreshUsers();
  }

  function openInviteUserModal(onDone) {
    openModal('Invite User', (body) => {
      const name     = formField(body, 'Name', 'text');
      const email    = formField(body, 'Email', 'email');
      const password = formField(body, 'Password', 'text');
      const role     = formSelect(body, 'Role', ROLES_LIST);
      return { name, email, password, role };
    }, async (fields) => {
      const res = await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify({
          name:     fields.name.value.trim(),
          email:    fields.email.value.trim(),
          password: fields.password.value,
          roles:    [fields.role.value],
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to invite user');
      }
      onDone();
    });
  }

  function openEditUserModal(row, onDone) {
    // roles may be an array; pick first role as default for the select
    const currentRole = Array.isArray(row.roles) ? (row.roles[0] ?? '') : String(row.roles ?? '');
    openModal('Edit User', (body) => {
      const name = formField(body, 'Name', 'text', row.name ?? '');
      const role = formSelect(body, 'Role', ROLES_LIST, currentRole);
      return { name, role };
    }, async (fields) => {
      const res = await apiFetch(`/api/v1/users/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name:  fields.name.value.trim(),
          roles: [fields.role.value],
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to update user');
      }
      onDone();
    });
  }

  // ── Roles ─────────────────────────────────────────────────────────────

  async function loadRoles() {
    const gridEl = html.take(contentContainer).div.getContext();
    try {
      const res = await apiFetch('/api/v1/roles');
      if (!res.ok) throw new Error('Failed to load roles');
      const rows = await res.json();

      const grid = new GridView('roles-grid', { rows: Array.isArray(rows) ? rows : [], meta: null }, [
        { id: 'name',             type: 'TextCell',  field: 'name',             label: 'Role Name' },
        { id: 'description',      type: 'TextCell',  field: 'description',      label: 'Description' },
        { id: 'permission_count', type: 'NumberCell', field: 'permission_count', label: 'Permissions' },
      ]);
      grid.mount(gridEl);
    } catch (err) {
      html.take(gridEl).div.className('alert alert-error').text(err.message);
    }
  }

  // ── Translations ──────────────────────────────────────────────────────

  async function loadTranslations() {
    let translationFilters = { lang: 'en', page_name: '', q: '' };

    // FilterBar
    const filterEl = html.take(contentContainer).div.getContext();
    const filterBar = new FilterBar('i18n-filter', { values: { lang: 'en' } }, [
      {
        field: 'lang', label: 'Language', type: 'select',
        options: I18N_LANGS.map(l => ({ value: l, label: l.toUpperCase() })),
      },
      {
        field: 'page_name', label: 'Page', type: 'select',
        options: I18N_PAGES.map(p => ({ value: p, label: p || 'All' })),
      },
      { field: 'q', label: 'Search', type: 'search', placeholder: 'Search text or translation…' },
    ]);

    const gridEl = html.take(contentContainer).div.style('margin-top:16px').getContext();
    let i18nGrid = null;
    const origMeta = { total: 0, page: 1, pageSize: 20 };
    let currentPage = 1;

    async function refreshTranslations() {
      const params = new URLSearchParams({ lang: translationFilters.lang });
      if (translationFilters.page_name) params.set('page', translationFilters.page_name);
      if (translationFilters.q)         params.set('q',    translationFilters.q);

      try {
        const res = await apiFetch(`/api/v1/i18n/list?${params}`);
        if (!res.ok) throw new Error('Failed to load translations');
        const data = await res.json();

        const rawRows = Array.isArray(data) ? data : (data.rows ?? data.data ?? []);
        const meta = Array.isArray(data)
          ? { total: rawRows.length, page: 1, pageSize: rawRows.length || 20 }
          : (data.meta ?? { total: rawRows.length, page: 1, pageSize: rawRows.length || 20 });

        const writeActions = canWrite
          ? [{ id: 'edit', label: 'Edit', variant: 'primary' }]
          : [];

        gridEl.innerHTML = '';
        i18nGrid = new GridView('i18n-grid', { rows: rawRows, meta }, [
          { id: 'lang',       type: 'BadgeCell', field: 'lang',       label: 'Lang' },
          { id: 'page',       type: 'TextCell',  field: 'page',       label: 'Page' },
          { id: 'component',  type: 'TextCell',  field: 'component',  label: 'Component' },
          { id: 'text',       type: 'TextCell',  field: 'text',       label: 'Source Text' },
          { id: 'translated', type: 'TextCell',  field: 'translated', label: 'Translation' },
          ...(canWrite ? [{ id: 'actions', type: 'ActionCell', field: '', label: '', actions: writeActions }] : []),
        ]);
        i18nGrid._onAction = (action, params) => {
          const row = params.row;
          if (action === 'edit') openEditTranslationModal(row, refreshTranslations);
        };
        i18nGrid.mount(gridEl);
      } catch (err) {
        gridEl.innerHTML = '';
        html.take(gridEl).div.className('alert alert-error').text(err.message);
      }
    }

    filterBar._onAction = (action, params) => {
      if (action === 'filter.change') {
        const v = params.values;
        translationFilters = {
          lang:      v.lang      || 'en',
          page_name: v.page_name || '',
          q:         v.q        || '',
        };
        refreshTranslations();
      } else if (action === 'filter.clear') {
        translationFilters = { lang: 'en', page_name: '', q: '' };
        refreshTranslations();
      }
    };

    filterBar.mount(filterEl);
    await refreshTranslations();
  }

  function openEditTranslationModal(row, onDone) {
    openModal('Edit Translation', (body) => {
      // Show source text for context
      const srcGroup = html.take(body).div.className('form-group').getContext();
      html.take(srcGroup).label.className('form-label').text('Source Text');
      html.take(srcGroup).div
        .style('padding:8px;background:var(--color-surface-muted,#f9fafb);border:1px solid var(--color-border,#e5e7eb);border-radius:6px;font-size:0.875rem;color:var(--color-text-secondary)')
        .text(row.text ?? '');
      const translated = formField(body, 'Translation', 'text', row.translated ?? '');
      return { translated };
    }, async (fields) => {
      const res = await apiFetch(`/api/v1/i18n/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ translated: fields.translated.value }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || 'Failed to update translation');
      }
      onDone();
    });
  }

  // Initial render
  renderTabs();
  await loadBranches();
}
