import { toXlsx } from '../../../lib/xlsx-utils.ts';

const baseUrl = (process.env.TMS_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: process.env.TMS_AUDIT_EMAIL || 'admin@tms.local', password: process.env.TMS_AUDIT_PASSWORD || 'admin123' }),
});
if (!login.ok) throw new Error(`login failed: ${login.status}`);
const { token } = await login.json() as { token: string };
let headers = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };

async function transition(action: string, id: string, expected: string) {
  const response = await fetch(`${baseUrl}/api/actions/${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id }),
  });
  const body = await response.json();
  if (!response.ok || body.status !== expected) {
    throw new Error(`${action}/${id}: expected ${expected}, got ${response.status} ${JSON.stringify(body)}`);
  }
}

async function expectRejected(action: string, id: string, expectedStatus = 409) {
  const response = await fetch(`${baseUrl}/api/actions/${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id }),
  });
  if (response.status !== expectedStatus) {
    throw new Error(`${action}/${id}: expected rejection ${expectedStatus}, got ${response.status}`);
  }
}

async function expectActionRejected(action: string, payload: Record<string, unknown>, expectedStatus = 400) {
  const response = await fetch(`${baseUrl}/api/actions/${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (response.status !== expectedStatus) {
    throw new Error(`${action}: expected rejection ${expectedStatus}, got ${response.status}`);
  }
}

async function expectActionSuccess(action: string, payload: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/api/actions/${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`${action}: expected success, got ${response.status}`);
}

// These records are consumed only on a disposable freshly seeded database.
const checks = [
  ['orders.submit_for_approval', 'order-01', 'Pending Approval'],
  ['orders.approve', 'order-01', 'Approved'],
  ['orders.submit_for_approval', 'order-02', 'Pending Approval'],
  ['orders.reject', 'order-02', 'Draft'],
  ['orders.cancel', 'order-03', 'Cancelled'],
  ['quotes.send', 'quote-02', 'Sent'],
  ['quotes.accept', 'quote-02', 'Accepted'],
  ['quotes.revise', 'quote-01', 'Draft'],
  ['quotes.send', 'quote-01', 'Sent'],
  ['quotes.cancel', 'quote-01', 'Cancelled'],
  ['accounting.debit_notes.submit_for_approval', 'acct-debit-01', 'Pending Approval'],
  ['accounting.debit_notes.approve', 'acct-debit-01', 'Approved'],
  ['accounting.debit_notes.mark_paid', 'acct-debit-01', 'Paid'],
  ['accounting.debit_notes.reject', 'acct-debit-02', 'Draft'],
  ['accounting.debit_notes.cancel', 'acct-debit-03', 'Cancelled'],
  ['accounting.payment_requests.submit_for_approval', 'acct-pay-03', 'Pending Approval'],
  ['accounting.payment_requests.approve', 'acct-pay-03', 'Approved'],
  ['accounting.payment_requests.mark_paid', 'acct-pay-03', 'Paid'],
  ['accounting.payment_requests.reject', 'acct-pay-01', 'Draft'],
  ['accounting.payment_requests.cancel', 'acct-pay-02', 'Cancelled'],
  ['accounting.advances.submit_for_approval', 'acct-advance-02', 'Pending Approval'],
  ['accounting.advances.approve', 'acct-advance-02', 'Approved'],
  ['accounting.advances.cancel', 'acct-advance-01', 'Cancelled'],
  ['accounting.settlements.reject', 'acct-settle-02', 'Draft'],
  ['accounting.settlements.cancel', 'acct-settle-01', 'Cancelled'],
  ['hr.payroll.approve', 'payroll-04', 'Approved'],
  ['hr.payroll.mark_paid', 'payroll-04', 'Paid'],
  ['hr.payroll.reopen', 'payroll-03', 'Draft'],
  ['trips.cancel', 'trip-07', 'Cancelled'],
] as const;

for (const [action, id, expected] of checks) await transition(action, id, expected);
const rejected = [
  ['orders.approve', 'order-02'],
  ['quotes.accept', 'quote-01'],
  ['accounting.debit_notes.approve', 'acct-debit-03'],
  ['accounting.payment_requests.mark_paid', 'acct-pay-01'],
  ['hr.payroll.mark_paid', 'payroll-03'],
  ['trips.cancel', 'trip-01'],
] as const;
for (const [action, id] of rejected) await expectRejected(action, id);
const validationRejections = [
  ['system.approval_steps.create', { id: 'sys-03', values: {} }],
  ['system.print_blocks.create', { id: 'sys-02', values: { block_type: 'text', label: '', content: '' } }],
  ['chat.messages.send', { id: 'chat-thread-ops-south', content: '' }],
] as const;
for (const [action, payload] of validationRejections) await expectActionRejected(action, payload);
await expectActionSuccess('system.approval_steps.move_down', { id: 'sys-03', step_id: 'flow-step-01' });
await expectActionSuccess('system.approval_steps.move_up', { id: 'sys-03', step_id: 'flow-step-01' });
await expectActionSuccess('system.print_blocks.move_down', { id: 'sys-02', block_id: 'tpl-block-01' });
await expectActionSuccess('system.print_blocks.move_up', { id: 'sys-02', block_id: 'tpl-block-01' });
const auditCode = `AUDIT-${Date.now()}`;
const patchRequest = async (body: Record<string, unknown>, expectedStatus: number) => {
  const response = await fetch(`${baseUrl}/api/patch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (response.status !== expectedStatus) {
    throw new Error(`patch expected ${expectedStatus}, got ${response.status}`);
  }
  return response.json();
};
const querySource = async (sourceId: string, requestHeaders = headers, params: Record<string, unknown> = {}) => {
  const response = await fetch(`${baseUrl}/api/query`, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify({ sourceId, params, top: 100 }),
  });
  if (!response.ok) throw new Error(`${sourceId}: expected query success, got ${response.status}`);
  return response.json() as Promise<{ data?: unknown[]; meta?: { total?: number } }>;
};

const allVehicles = await querySource('vehicles');
const allDashboard = await querySource('dashboard_kpis');
const allCustomers = await querySource('customers');
const allPartners = await querySource('partners');
await patchRequest({
  table: 'roles',
  action: 'update',
  id: 'role-fleet-manager',
  changes: [{ field: 'view_scope', value: 'branch' }],
}, 200);
const fleetLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'fleet@tms.local', password: 'fleet123' }),
});
if (!fleetLogin.ok) throw new Error(`fleet scope login failed: ${fleetLogin.status}`);
const { token: fleetToken, user: fleetUser } = await fleetLogin.json() as { token: string; user: { view_scope?: string; branch_id?: string } };
if (fleetUser.view_scope !== 'branch' || !fleetUser.branch_id) {
  throw new Error(`branch scope was not included in fleet session: ${JSON.stringify(fleetUser)}`);
}
const fleetVehicles = await querySource('vehicles', {
  Authorization: `Bearer ${fleetToken}`,
  'content-type': 'application/json',
});
if (Number(fleetVehicles.meta?.total || 0) >= Number(allVehicles.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce vehicle visibility: all=${allVehicles.meta?.total} fleet=${fleetVehicles.meta?.total}`);
}
const fleetDashboard = await querySource('dashboard_kpis', {
  Authorization: `Bearer ${fleetToken}`,
  'content-type': 'application/json',
});
const allTripCount = Number((allDashboard.data as any)?.total_trips || 0);
const fleetTripCount = Number((fleetDashboard.data as any)?.total_trips || 0);
if (fleetTripCount >= allTripCount) {
  throw new Error(`branch scope did not reduce dashboard trip visibility: all=${allTripCount} fleet=${fleetTripCount}`);
}
const outOfScopeMutation = await fetch(`${baseUrl}/api/patch`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${fleetToken}`, 'content-type': 'application/json' },
  body: JSON.stringify({
    table: 'trucks',
    action: 'update',
    id: 'truck-03',
    changes: [{ field: 'notes', value: 'scope audit must reject this' }],
  }),
});
if (outOfScopeMutation.status !== 403) {
  throw new Error(`branch scope mutation expected 403, got ${outOfScopeMutation.status}`);
}
await patchRequest({
  table: 'roles',
  action: 'update',
  id: 'role-fleet-manager',
  changes: [{ field: 'view_scope', value: 'all' }],
}, 200);
await patchRequest({
  table: 'roles',
  action: 'update',
  id: 'role-admin',
  changes: [{ field: 'view_scope', value: 'own' }],
}, 200);
const ownAdminLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@tms.local', password: 'admin123' }),
});
if (!ownAdminLogin.ok) throw new Error(`own-scope admin login failed: ${ownAdminLogin.status}`);
const { token: ownAdminToken } = await ownAdminLogin.json() as { token: string };
const ownHeaders = { Authorization: `Bearer ${ownAdminToken}`, 'content-type': 'application/json' };
const ownCustomers = await querySource('customers', ownHeaders);
const ownPartners = await querySource('partners', ownHeaders);
if (Number(ownCustomers.meta?.total || 0) >= Number(allCustomers.meta?.total || 0)) {
  throw new Error(`own scope did not reduce customer visibility: all=${allCustomers.meta?.total} own=${ownCustomers.meta?.total}`);
}
if (Number(ownPartners.meta?.total || 0) >= Number(allPartners.meta?.total || 0)) {
  throw new Error(`own scope did not reduce partner visibility: all=${allPartners.meta?.total} own=${ownPartners.meta?.total}`);
}
const hiddenPrivateCustomer = await querySource('crm_entity_detail', ownHeaders, { kind: 'customer', id: 'customer-02' });
if (Object.keys((hiddenPrivateCustomer.data as any) || {}).length) throw new Error('own scope leaked another owner private customer');
const hiddenCustomerMutation = await fetch(`${baseUrl}/api/patch`, {
  method: 'POST',
  headers: ownHeaders,
  body: JSON.stringify({
    table: 'customers',
    action: 'update',
    id: 'customer-02',
    changes: [{ field: 'phone', value: 'scope audit must reject this' }],
  }),
});
if (hiddenCustomerMutation.status !== 403) {
  throw new Error(`own scope CRM mutation expected 403, got ${hiddenCustomerMutation.status}`);
}
const hiddenContactMutation = await fetch(`${baseUrl}/api/actions/crm.contacts.create`, {
  method: 'POST',
  headers: ownHeaders,
  body: JSON.stringify({
    id: 'customer-02',
    kind: 'customer',
    values: { name: 'Scope audit must reject this', phone: '000' },
  }),
});
if (hiddenContactMutation.status !== 403) {
  throw new Error(`own scope CRM contact mutation expected 403, got ${hiddenContactMutation.status}`);
}
await patchRequest({
  table: 'roles',
  action: 'update',
  id: 'role-admin',
  changes: [{ field: 'view_scope', value: 'all' }],
}, 200);
await patchRequest({
  table: 'roles',
  action: 'update',
  id: 'role-admin',
  changes: [{ field: 'view_scope', value: 'branch' }],
}, 200);
const scopedAdminLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin@tms.local', password: 'admin123' }),
});
if (!scopedAdminLogin.ok) throw new Error(`scoped admin login failed: ${scopedAdminLogin.status}`);
const { token: scopedAdminToken } = await scopedAdminLogin.json() as { token: string };
const scopedHeaders = { Authorization: `Bearer ${scopedAdminToken}`, 'content-type': 'application/json' };
const hiddenBranch = await querySource('branch_detail', scopedHeaders, { id: 'branch-hn' });
if (Object.keys((hiddenBranch.data as any) || {}).length) throw new Error('branch detail leaked an out-of-scope branch');
const hiddenDriver = await querySource('driver_detail', scopedHeaders, { id: 'driver-03' });
if (Object.keys((hiddenDriver.data as any) || {}).length) throw new Error('driver detail leaked an out-of-scope driver');
const scopedEmployees = await querySource('employees', scopedHeaders);
const scopedContracts = await querySource('contracts', scopedHeaders);
const scopedTimesheets = await querySource('timesheets', scopedHeaders);
const scopedPayroll = await querySource('payroll', scopedHeaders);
const allEmployees = await querySource('employees');
const allContracts = await querySource('contracts');
const allTimesheets = await querySource('timesheets');
const allPayroll = await querySource('payroll');
for (const [label, scoped, all] of [
  ['employees', scopedEmployees, allEmployees],
  ['contracts', scopedContracts, allContracts],
  ['timesheets', scopedTimesheets, allTimesheets],
  ['payroll', scopedPayroll, allPayroll],
] as const) {
  if (Number(scoped.meta?.total || 0) >= Number(all.meta?.total || 0)) {
    throw new Error(`branch scope did not reduce ${label} visibility: all=${all.meta?.total} scoped=${scoped.meta?.total}`);
  }
}
const hiddenEmployee = await querySource('employee_detail', scopedHeaders, { id: 'employee-06' });
if (Object.keys((hiddenEmployee.data as any) || {}).length) throw new Error('employee detail leaked an out-of-scope employee');
const outOfScopeEmployeeMutation = await fetch(`${baseUrl}/api/patch`, {
  method: 'POST',
  headers: scopedHeaders,
  body: JSON.stringify({
    table: 'employees',
    action: 'update',
    id: 'employee-06',
    changes: [{ field: 'phone', value: 'scope audit must reject this' }],
  }),
});
if (outOfScopeEmployeeMutation.status !== 403) {
  throw new Error(`branch scope HR mutation expected 403, got ${outOfScopeEmployeeMutation.status}`);
}
const scopedTrips = await querySource('trips', scopedHeaders);
const scopedMaintenance = await querySource('maintenance', scopedHeaders);
const allTrips = await querySource('trips');
const allMaintenance = await querySource('maintenance');
if (Number(scopedTrips.meta?.total || 0) >= Number(allTrips.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce legacy trip visibility: all=${allTrips.meta?.total} scoped=${scopedTrips.meta?.total}`);
}
if (Number(scopedMaintenance.meta?.total || 0) >= Number(allMaintenance.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce legacy maintenance visibility: all=${allMaintenance.meta?.total} scoped=${scopedMaintenance.meta?.total}`);
}
const outOfScopeTripMutation = await fetch(`${baseUrl}/api/patch`, {
  method: 'POST',
  headers: scopedHeaders,
  body: JSON.stringify({
    table: 'trips',
    action: 'update',
    id: 'trip-02',
    changes: [{ field: 'notes', value: 'scope audit must reject this' }],
  }),
});
if (outOfScopeTripMutation.status !== 403) {
  throw new Error(`branch scope trip mutation expected 403, got ${outOfScopeTripMutation.status}`);
}
const scopedDebitNotes = await querySource('debit_notes', scopedHeaders);
const allDebitNotes = await querySource('debit_notes', headers);
if (Number(scopedDebitNotes.meta?.total || 0) >= Number(allDebitNotes.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce accounting visibility: all=${allDebitNotes.meta?.total} scoped=${scopedDebitNotes.meta?.total}`);
}
const hiddenAccountingDocument = await querySource('accounting_document_detail', scopedHeaders, { id: 'acct-debit-03', kind: 'debit_note' });
if (Object.keys((hiddenAccountingDocument.data as any) || {}).length) throw new Error('accounting detail leaked an out-of-scope document');
const outOfScopeAccountingMutation = await fetch(`${baseUrl}/api/patch`, {
  method: 'POST',
  headers: scopedHeaders,
  body: JSON.stringify({
    table: 'accounting_entries',
    action: 'update',
    scope: 'debit_note',
    id: 'acct-debit-03',
    changes: [{ field: 'description', value: 'scope audit must reject this' }],
  }),
});
if (outOfScopeAccountingMutation.status !== 403) {
  throw new Error(`branch scope accounting mutation expected 403, got ${outOfScopeAccountingMutation.status}`);
}
const scopedOrders = await querySource('orders', scopedHeaders);
const scopedQuotes = await querySource('quotes', scopedHeaders);
const allOrders = await querySource('orders', headers);
const allQuotes = await querySource('quotes', headers);
if (Number(scopedOrders.meta?.total || 0) >= Number(allOrders.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce order visibility: all=${allOrders.meta?.total} scoped=${scopedOrders.meta?.total}`);
}
if (Number(scopedQuotes.meta?.total || 0) >= Number(allQuotes.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce quote visibility: all=${allQuotes.meta?.total} scoped=${scopedQuotes.meta?.total}`);
}
const hiddenOrder = await querySource('order_detail', scopedHeaders, { id: 'order-03' });
const hiddenQuote = await querySource('quote_detail', scopedHeaders, { id: 'quote-03' });
if (Object.keys((hiddenOrder.data as any) || {}).length) throw new Error('order detail leaked an out-of-scope order');
if (Object.keys((hiddenQuote.data as any) || {}).length) throw new Error('quote detail leaked an out-of-scope quote');
const outOfScopeOrderMutation = await fetch(`${baseUrl}/api/actions/orders.cancel`, {
  method: 'POST',
  headers: scopedHeaders,
  body: JSON.stringify({ id: 'order-03' }),
});
if (outOfScopeOrderMutation.status !== 403) {
  throw new Error(`branch scope order action expected 403, got ${outOfScopeOrderMutation.status}`);
}
const outOfScopeQuoteMutation = await fetch(`${baseUrl}/api/patch`, {
  method: 'POST',
  headers: scopedHeaders,
  body: JSON.stringify({
    table: 'quotes',
    action: 'update',
    id: 'quote-03',
    changes: [{ field: 'title', value: 'scope audit must reject this' }],
  }),
});
if (outOfScopeQuoteMutation.status !== 403) {
  throw new Error(`branch scope quote mutation expected 403, got ${outOfScopeQuoteMutation.status}`);
}
await patchRequest({
  table: 'roles',
  action: 'update',
  id: 'role-admin',
  changes: [{ field: 'view_scope', value: 'all' }],
}, 200);

const createdMaster = await patchRequest({
  table: 'master_data',
  action: 'insert',
  scope: 'unit',
  changes: [
    { field: 'code', value: auditCode },
    { field: 'name', value: 'Audit unit' },
    { field: 'status', value: 'Active' },
  ],
}, 201);
if (!createdMaster?.id) throw new Error('master-data create did not return an id');
await patchRequest({
  table: 'master_data',
  action: 'update',
  scope: 'unit',
  id: createdMaster.id,
  changes: [{ field: 'name', value: 'Audit unit updated' }],
}, 200);
await patchRequest({
  table: 'master_data',
  action: 'delete',
  scope: 'unit',
  id: createdMaster.id,
  changes: [],
}, 200);
await patchRequest({
  table: 'orders',
  action: 'update',
  id: 'order-01',
  changes: [{ field: 'status', value: 'Approved' }],
}, 400);
await patchRequest({
  table: 'roles',
  action: 'update',
  id: 'role-admin',
  changes: [{ field: 'view_scope', value: 'branch' }],
}, 200);
await patchRequest({
  table: 'roles',
  action: 'update',
  id: 'role-admin',
  changes: [{ field: 'view_scope', value: 'invalid' }],
}, 400);
await patchRequest({
  table: 'roles',
  action: 'update',
  id: 'role-admin',
  changes: [{ field: 'view_scope', value: 'all' }],
}, 200);
await patchRequest({
  table: 'areas',
  action: 'update',
  id: 'area-01',
  changes: [{ field: 'parent_id', value: 'area-01' }],
}, 400);
await patchRequest({
  table: 'areas',
  action: 'update',
  id: 'area-01',
  changes: [{ field: 'parent_id', value: 'area-02' }],
}, 200);
await patchRequest({
  table: 'areas',
  action: 'update',
  id: 'area-02',
  changes: [{ field: 'parent_id', value: 'area-01' }],
}, 400);
await patchRequest({
  table: 'accounting_entries',
  action: 'update',
  scope: 'ledger_account',
  id: 'acct-ledger-01',
  changes: [{ field: 'parent_id', value: 'acct-ledger-01' }],
}, 400);
await patchRequest({
  table: 'accounting_entries',
  action: 'update',
  scope: 'settlement',
  id: 'acct-settle-01',
  changes: [{ field: 'linked_advance_id', value: 'acct-pay-01' }],
}, 400);
const currencySync = await fetch(`${baseUrl}/api/actions/catalog.currencies.sync_rates`, {
  method: 'POST',
  headers,
  body: JSON.stringify({}),
});
if (!currencySync.ok) throw new Error(`currency sync expected 200, got ${currencySync.status}`);
const currencySyncBody = await currencySync.json() as { synced?: number };
if (currencySyncBody.synced !== 3) throw new Error(`currency sync expected 3 rates, got ${JSON.stringify(currencySyncBody)}`);
const currencyQuery = await fetch(`${baseUrl}/api/query`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ sourceId: 'currencies', top: 20 }),
});
if (!currencyQuery.ok) throw new Error(`currency query expected 200, got ${currencyQuery.status}`);
const currencyRows = await currencyQuery.json() as { data?: Array<{ code?: string; rate_to_vnd?: number }> };
if (currencyRows.data?.find((row) => row.code === 'USD')?.rate_to_vnd !== 25400) {
  throw new Error(`currency rate did not persist: ${JSON.stringify(currencyRows.data)}`);
}
const invalidImport = new FormData();
invalidImport.append('file', new File(['not,valid\n'], 'audit.csv', { type: 'text/csv' }));
invalidImport.append('meta', JSON.stringify({ kind: 'master_data_import', scope: 'unit' }));
const importResponse = await fetch(`${baseUrl}/api/upload`, {
  method: 'POST',
  headers: { Authorization: headers.Authorization },
  body: invalidImport,
});
if (importResponse.status !== 400) throw new Error(`invalid import expected 400, got ${importResponse.status}`);
const xlsxImport = new FormData();
xlsxImport.append('file', new File([toXlsx([{ code: 'AUDIT-XLSX', name: 'Audit XLSX', status: 'Active' }], [
  { field: 'code', label: 'code' }, { field: 'name', label: 'name' }, { field: 'status', label: 'status' },
])], 'audit.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
xlsxImport.append('meta', JSON.stringify({ kind: 'master_data_import', scope: 'unit' }));
const xlsxResponse = await fetch(`${baseUrl}/api/upload`, { method: 'POST', headers: { Authorization: headers.Authorization }, body: xlsxImport });
if (xlsxResponse.status !== 200) throw new Error(`xlsx import expected 200, got ${xlsxResponse.status}`);
const contractUpload = new FormData();
contractUpload.append('file', new File(['contract-audit'], 'contract-audit.txt', { type: 'text/plain' }));
contractUpload.append('meta', JSON.stringify({ kind: 'contract_document', contract_id: 'contract-01' }));
const contractUploadResponse = await fetch(`${baseUrl}/api/upload`, { method: 'POST', headers: { Authorization: headers.Authorization }, body: contractUpload });
if (contractUploadResponse.status !== 200) throw new Error(`contract document upload expected 200, got ${contractUploadResponse.status}`);
const contractDocument = await contractUploadResponse.json() as { id?: string };
if (!contractDocument.id) throw new Error(`contract document upload missing id: ${JSON.stringify(contractDocument)}`);
const contractDownloadResponse = await fetch(`${baseUrl}/api/hr/contract-documents/${encodeURIComponent(contractDocument.id)}`, { headers: { Authorization: headers.Authorization } });
if (contractDownloadResponse.status !== 200 || await contractDownloadResponse.text() !== 'contract-audit') throw new Error(`contract document download failed: ${contractDownloadResponse.status}`);
const companyUpload = new FormData();
companyUpload.append('file', new File(['company-audit'], 'company-audit.txt', { type: 'text/plain' }));
companyUpload.append('meta', JSON.stringify({ kind: 'company_document', company_id: 'company-main' }));
const companyUploadResponse = await fetch(`${baseUrl}/api/upload`, { method: 'POST', headers: { Authorization: headers.Authorization }, body: companyUpload });
if (companyUploadResponse.status !== 200) throw new Error(`company document upload expected 200, got ${companyUploadResponse.status}`);
const companyDocument = await companyUploadResponse.json() as { id?: string };
if (!companyDocument.id) throw new Error(`company document upload missing id: ${JSON.stringify(companyDocument)}`);
const companyDownloadResponse = await fetch(`${baseUrl}/api/org/company-documents/${encodeURIComponent(companyDocument.id)}`, { headers: { Authorization: headers.Authorization } });
if (companyDownloadResponse.status !== 200 || await companyDownloadResponse.text() !== 'company-audit') throw new Error(`company document download failed: ${companyDownloadResponse.status}`);
const restrictedLogin = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'accountant@tms.local', password: 'accountant123' }),
});
if (!restrictedLogin.ok) throw new Error(`restricted login failed: ${restrictedLogin.status}`);
const { token: restrictedToken } = await restrictedLogin.json() as { token: string };
headers = { Authorization: `Bearer ${restrictedToken}`, 'content-type': 'application/json' };
await expectActionRejected('orders.submit_for_approval', { id: 'order-01' }, 403);
console.log(`workflow_transitions=${checks.length} rejected_transitions=${rejected.length} validation_rejections=${validationRejections.length} crud_roundtrips=1 reorder_roundtrips=2 invalid_imports=1 xlsx_roundtrips=1 contract_documents=1 company_documents=1 permission_denials=1 role_scope_updates=9 scope_mutation_denials=2 scope_crm_mutation_denials=2 scope_hr_mutation_denials=1 scope_accounting_mutation_denials=1 scope_commercial_mutation_denials=2 scope_detail_denials=6 scope_visibility_denials=1 area_hierarchy_rejections=2 ledger_hierarchy_rejections=1 accounting_link_rejections=1 failures=0`);
