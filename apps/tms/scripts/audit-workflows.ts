import { toXlsx } from '../../lib/xlsx-utils.ts';

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

async function actionRequest(action: string, payload: Record<string, unknown>, expectedStatus = 200) {
  const response = await fetch(`${baseUrl}/api/actions/${action}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (response.status !== expectedStatus) throw new Error(`${action}: expected ${expectedStatus}, got ${response.status}`);
  return response.json();
}

async function expectActionSuccess(action: string, payload: Record<string, unknown>) {
  await actionRequest(action, payload);
}

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

let financialDetailUpdates = 0;
await actionRequest('accounting.documents.update', {
  id: 'acct-debit-01',
  kind: 'debit_note',
  values: {
    code: 'GBN-0001',
    name: 'Cước vận chuyển tháng 7',
    counterparty: 'Công ty CP Đại Phát',
    currency: 'VND',
    document_date: '2026-07-24',
    due_date: '2026-08-05',
    description: 'Đối soát tuyến Hà Nội - Đà Nẵng',
  },
});
financialDetailUpdates++;
let orderDetailUpdates = 0;
await patchRequest({
  table: 'orders',
  action: 'update',
  id: 'order-01',
  changes: [{ field: 'notes', value: 'Order detail audit' }],
}, 200);
orderDetailUpdates++;

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
  ['trips.start', 'trip-07', 'In Transit'],
  ['trips.complete', 'trip-05', 'Completed'],
  ['trips.cancel', 'trip-07', 'Cancelled'],
] as const;

for (const [action, id, expected] of checks) await transition(action, id, expected);
const rejected = [
  ['orders.approve', 'order-02'],
  ['quotes.accept', 'quote-01'],
  ['accounting.debit_notes.approve', 'acct-debit-03'],
  ['accounting.payment_requests.mark_paid', 'acct-pay-01'],
  ['hr.payroll.mark_paid', 'payroll-03'],
  ['trips.start', 'trip-01'],
  ['trips.complete', 'trip-07'],
  ['trips.cancel', 'trip-01'],
] as const;
for (const [action, id] of rejected) await expectRejected(action, id);
const validationRejections = [
  ['system.approval_steps.create', { id: 'sys-03', values: {} }],
  ['system.print_blocks.create', { id: 'sys-02', values: { block_type: 'text', label: '', content: '' } }],
  ['chat.messages.send', { id: 'chat-thread-ops-south', content: '' }],
] as const;
for (const [action, payload] of validationRejections) await expectActionRejected(action, payload);
const createdApprovalStep = await actionRequest('system.approval_steps.create', {
  id: 'sys-03',
  values: { name: 'Audit approval step', approver_role: 'Audit Manager', min_amount: 2500000, status: 'Active' },
}) as { id?: string };
if (!createdApprovalStep.id) throw new Error('approval step create did not return an id');
await actionRequest('system.approval_steps.update', {
  id: 'sys-03',
  step_id: createdApprovalStep.id,
  values: { name: 'Audit approval step updated', approver_role: 'Audit Director', min_amount: 3000000, status: 'Inactive' },
});
await actionRequest('system.approval_steps.delete', { id: 'sys-03', step_id: createdApprovalStep.id });
await expectActionRejected('system.print_blocks.create', {
  id: 'sys-02',
  values: { block_type: 'token', label: 'Invalid token', token_key: 'order.password', status: 'Active' },
}, 400);
const createdPrintBlock = await actionRequest('system.print_blocks.create', {
  id: 'sys-02',
  values: { block_type: 'text', label: 'Audit print block', content: 'Audit content', status: 'Active' },
}) as { id?: string };
if (!createdPrintBlock.id) throw new Error('print block create did not return an id');
await actionRequest('system.print_blocks.update', {
  id: 'sys-02',
  block_id: createdPrintBlock.id,
  values: { block_type: 'token', label: 'Audit print token', token_key: 'order.order_number', content: '', status: 'Active' },
});
await actionRequest('system.print_blocks.delete', { id: 'sys-02', block_id: createdPrintBlock.id });
await expectActionSuccess('system.approval_steps.move_down', { id: 'sys-03', step_id: 'flow-step-01' });
await expectActionSuccess('system.approval_steps.move_up', { id: 'sys-03', step_id: 'flow-step-01' });
await expectActionSuccess('system.print_blocks.move_down', { id: 'sys-02', block_id: 'tpl-block-01' });
await expectActionSuccess('system.print_blocks.move_up', { id: 'sys-02', block_id: 'tpl-block-01' });
const auditCode = `AUDIT-${Date.now()}`;
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
let crmEntityUpdates = 0;
for (const kind of ['customer', 'partner'] as const) {
  const detail = await querySource('crm_entity_detail', headers, { id: `${kind}-01`, kind });
  const row = detail.data as any;
  if (!row?.id || row.kind !== kind || !row.status || (kind === 'customer' ? !row.stage : !row.partner_type)) {
    throw new Error(`CRM ${kind} detail did not expose editable raw values: ${JSON.stringify(row)}`);
  }
  await actionRequest('crm.entities.update', {
    id: row.id,
    kind,
    values: {
      code: row.code,
      name: row.name,
      tax_code: row.tax_code,
      phone: row.phone,
      email: row.email,
      stage: row.stage,
      partner_type: row.partner_type,
      owner_name: row.owner_name,
      visibility: row.visibility,
      status: row.status,
    },
  });
  crmEntityUpdates++;
}
const mismatchedCrmKind = await fetch(`${baseUrl}/api/actions/crm.entities.update`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ id: 'partner-01', kind: 'customer', values: { code: 'BAD', name: 'BAD' } }),
});
if (mismatchedCrmKind.status !== 403) throw new Error(`mismatched CRM kind expected 403, got ${mismatchedCrmKind.status}`);
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
const fleetHeaders = { Authorization: `Bearer ${fleetToken}`, 'content-type': 'application/json' };
const allReportsFleet = await querySource('reports_fleet', headers);
const scopedReportsFleet = await querySource('reports_fleet', fleetHeaders);
const reportAggregateFields = ['total_trucks', 'active_trucks', 'maintenance_trucks'] as const;
for (const field of reportAggregateFields) {
  const allValue = Number((allReportsFleet.data as any)?.[field] || 0);
  const scopedValue = Number((scopedReportsFleet.data as any)?.[field] || 0);
  if (scopedValue > allValue) throw new Error(`branch scope increased report ${field}: all=${allValue} scoped=${scopedValue}`);
}
if (Number((scopedReportsFleet.data as any)?.total_trucks || 0) >= Number((allReportsFleet.data as any)?.total_trucks || 0)) {
  throw new Error('branch scope did not reduce reports fleet totals');
}
const allReportsDrivers = await querySource('reports_drivers', headers);
const scopedReportsDrivers = await querySource('reports_drivers', fleetHeaders);
if (Number(scopedReportsDrivers.meta?.total || 0) >= Number(allReportsDrivers.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce driver report visibility: all=${allReportsDrivers.meta?.total} scoped=${scopedReportsDrivers.meta?.total}`);
}
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
await patchRequest({
  table: 'users',
  action: 'update',
  id: 'user-hr',
  changes: [{ field: 'branch_id', value: 'branch-hn' }],
}, 200);
const scopedRoleUsers = await querySource('role_users', scopedHeaders, { id: 'role-hr-officer' });
if ((scopedRoleUsers.data as any[]).some((row) => row.id === 'user-hr')) {
  throw new Error('role detail leaked an out-of-scope user membership');
}
const outOfScopeRoleMutation = await fetch(`${baseUrl}/api/actions/settings.users.grant_role`, {
  method: 'POST',
  headers: scopedHeaders,
  body: JSON.stringify({ id: 'user-hr', role_id: 'role-admin' }),
});
if (outOfScopeRoleMutation.status !== 403) {
  throw new Error(`out-of-scope role assignment expected 403, got ${outOfScopeRoleMutation.status}`);
}
const outOfScopeUserDepartment = await fetch(`${baseUrl}/api/patch`, {
  method: 'POST',
  headers: scopedHeaders,
  body: JSON.stringify({
    table: 'users',
    action: 'update',
    id: 'user-admin',
    changes: [{ field: 'department_id', value: 'department-05' }],
  }),
});
if (outOfScopeUserDepartment.status !== 403) {
  throw new Error(`out-of-scope user department assignment expected 403, got ${outOfScopeUserDepartment.status}`);
}
const outOfScopeDepartmentParent = await fetch(`${baseUrl}/api/patch`, {
  method: 'POST',
  headers: scopedHeaders,
  body: JSON.stringify({
    table: 'departments',
    action: 'update',
    id: 'department-01',
    changes: [{ field: 'parent_id', value: 'department-05' }],
  }),
});
if (outOfScopeDepartmentParent.status !== 403) {
  throw new Error(`out-of-scope department parent expected 403, got ${outOfScopeDepartmentParent.status}`);
}
await patchRequest({
  table: 'users',
  action: 'update',
  id: 'user-hr',
  changes: [{ field: 'branch_id', value: 'branch-hcm' }],
}, 200);
const outOfScopeContractUpload = new FormData();
outOfScopeContractUpload.append('file', new File(['out-of-scope-audit'], 'out-of-scope-audit.txt', { type: 'text/plain' }));
outOfScopeContractUpload.append('meta', JSON.stringify({ kind: 'contract_document', contract_id: 'contract-06' }));
const outOfScopeContractResponse = await fetch(`${baseUrl}/api/upload`, {
  method: 'POST',
  headers: { Authorization: headers.Authorization },
  body: outOfScopeContractUpload,
});
if (outOfScopeContractResponse.status !== 200) throw new Error(`out-of-scope contract upload expected 200, got ${outOfScopeContractResponse.status}`);
const allActivity = await querySource('system_activity', headers);
const scopedActivity = await querySource('system_activity', scopedHeaders);
if (Number(scopedActivity.meta?.total || 0) >= Number(allActivity.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce activity visibility: all=${allActivity.meta?.total} scoped=${scopedActivity.meta?.total}`);
}
if ((scopedActivity.data as any[]).some((row) => row.resource_id === 'contract-06')) {
  throw new Error('activity log leaked an out-of-scope contract event');
}
const allStorage = await querySource('storage_usage', headers);
const scopedStorage = await querySource('storage_usage', scopedHeaders);
if (Number((scopedStorage.data as any)?.used_bytes || 0) > Number((allStorage.data as any)?.used_bytes || 0)) {
  throw new Error(`branch scope increased storage visibility: all=${(allStorage.data as any)?.used_bytes} scoped=${(scopedStorage.data as any)?.used_bytes}`);
}
if (Number((scopedStorage.data as any)?.used_bytes || 0) >= Number((allStorage.data as any)?.used_bytes || 0)) {
  throw new Error('branch scope did not reduce storage visibility');
}
const allReportsCosts = await querySource('reports_costs', headers);
const scopedReportsCosts = await querySource('reports_costs', scopedHeaders);
if (Number((scopedReportsCosts.data as any)?.total_services || 0) >= Number((allReportsCosts.data as any)?.total_services || 0)) {
  throw new Error('branch scope did not reduce reports cost totals');
}
const scopedDashboard = await querySource('dashboard_kpis', scopedHeaders);
const dashboardScopeFields = ['active_trucks', 'draft_orders', 'revenue_total', 'cost_total', 'overdue_debit_notes', 'active_employees', 'available_containers', 'payroll_total'] as const;
let reducedDashboardFields = 0;
for (const field of dashboardScopeFields) {
  const allValue = Number((allDashboard.data as any)?.[field] || 0);
  const scopedValue = Number((scopedDashboard.data as any)?.[field] || 0);
  if (scopedValue > allValue) throw new Error(`branch scope increased dashboard ${field}: all=${allValue} scoped=${scopedValue}`);
  if (scopedValue < allValue) reducedDashboardFields++;
}
if (reducedDashboardFields < 2) throw new Error('branch scope did not reduce dashboard financial/operational aggregates');
const allCrmKpis = await querySource('crm_kpis', headers);
const scopedCrmKpis = await querySource('crm_kpis', scopedHeaders);
const crmScopeFields = ['customer_count', 'employee_count', 'team_count', 'accepted_quote_count', 'approved_order_count'] as const;
let reducedCrmFields = 0;
for (const field of crmScopeFields) {
  const allValue = Number((allCrmKpis.data as any)?.[field] || 0);
  const scopedValue = Number((scopedCrmKpis.data as any)?.[field] || 0);
  if (scopedValue > allValue) throw new Error(`branch scope increased CRM ${field}: all=${allValue} scoped=${scopedValue}`);
  if (scopedValue < allValue) reducedCrmFields++;
}
if (reducedCrmFields < 2) throw new Error('branch scope did not reduce CRM aggregates');
const scopedCrmQuotes = await querySource('crm_recent_quotes', scopedHeaders);
const allCrmQuotes = await querySource('crm_recent_quotes', headers);
if (Number(scopedCrmQuotes.meta?.total || 0) >= Number(allCrmQuotes.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce CRM quote visibility: all=${allCrmQuotes.meta?.total} scoped=${scopedCrmQuotes.meta?.total}`);
}
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
const scopedTripBranches = await querySource('trip_branch_lookup', scopedHeaders);
const allTripBranches = await querySource('trip_branch_lookup');
if ((scopedTripBranches.data as any[]).some((row) => row.value !== 'branch-hcm')) {
  throw new Error('branch scope leaked an out-of-scope trip editor branch');
}
if (Number(scopedTripBranches.meta?.total || 0) >= Number(allTripBranches.meta?.total || 0)) {
  throw new Error('trip editor branch lookup was not reduced by branch scope');
}
if ((allTrips.data as any[]).some((trip) => !trip.branch_id)) {
  throw new Error('trip seed/migration left a trip without explicit branch ownership');
}
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
const allOrderCustomerLookup = await querySource('order_customer_lookup', headers);
const scopedOrderCustomerLookup = await querySource('order_customer_lookup', scopedHeaders);
const privateCustomerName = 'Công ty TNHH Thương mại Minh Phát';
if (!(allOrderCustomerLookup.data as any[]).some((row) => row.value === privateCustomerName)) {
  throw new Error('all-scope order customer lookup did not expose the seeded private customer');
}
if ((scopedOrderCustomerLookup.data as any[]).some((row) => row.value === privateCustomerName)) {
  throw new Error('branch-scope order customer lookup leaked a private customer');
}
if (Number(scopedOrderCustomerLookup.meta?.total || 0) >= Number(allOrderCustomerLookup.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce order customer lookup: all=${allOrderCustomerLookup.meta?.total} scoped=${scopedOrderCustomerLookup.meta?.total}`);
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
const scopedLocations = await querySource('locations', scopedHeaders);
const scopedContainers = await querySource('containers', scopedHeaders);
const allLocations = await querySource('locations', headers);
const allContainers = await querySource('containers', headers);
if (Number(scopedLocations.meta?.total || 0) >= Number(allLocations.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce location visibility: all=${allLocations.meta?.total} scoped=${scopedLocations.meta?.total}`);
}
if (Number(scopedContainers.meta?.total || 0) >= Number(allContainers.meta?.total || 0)) {
  throw new Error(`branch scope did not reduce container visibility: all=${allContainers.meta?.total} scoped=${scopedContainers.meta?.total}`);
}
if ((scopedLocations.data as any[]).some((row) => row.id === 'location-03')) {
  throw new Error('location list leaked an out-of-scope location');
}
if ((scopedContainers.data as any[]).some((row) => row.id === 'container-04')) {
  throw new Error('container list leaked an out-of-scope container');
}
const outOfScopeLocationMutation = await fetch(`${baseUrl}/api/patch`, {
  method: 'POST',
  headers: scopedHeaders,
  body: JSON.stringify({
    table: 'locations',
    action: 'update',
    id: 'location-03',
    changes: [{ field: 'name', value: 'scope audit must reject this' }],
  }),
});
if (outOfScopeLocationMutation.status !== 403) {
  throw new Error(`branch scope location mutation expected 403, got ${outOfScopeLocationMutation.status}`);
}
const outOfScopeContainerMutation = await fetch(`${baseUrl}/api/patch`, {
  method: 'POST',
  headers: scopedHeaders,
  body: JSON.stringify({
    table: 'containers',
    action: 'update',
    id: 'container-04',
    changes: [{ field: 'status', value: 'Unavailable' }],
  }),
});
if (outOfScopeContainerMutation.status !== 403) {
  throw new Error(`branch scope container mutation expected 403, got ${outOfScopeContainerMutation.status}`);
}
const outOfScopeChatMessage = await fetch(`${baseUrl}/api/actions/chat.messages.send`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${fleetToken}`, 'content-type': 'application/json' },
  body: JSON.stringify({ id: 'chat-thread-finance', content: 'scope audit must reject this' }),
});
if (outOfScopeChatMessage.status !== 404) {
  throw new Error(`chat membership denial expected 404, got ${outOfScopeChatMessage.status}`);
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
  action: 'insert',
  scope: 'unit',
  changes: [
    { field: 'code', value: 'AUDIT-INVALID' },
    { field: 'name', value: 'Invalid unit' },
    { field: 'status', value: 'Broken' },
  ],
}, 400);
await patchRequest({
  table: 'system_configs',
  action: 'insert',
  scope: 'code_rule',
  changes: [
    { field: 'code', value: 'AUDIT-INVALID-RULE' },
    { field: 'name', value: 'Invalid rule' },
    { field: 'prefix', value: 'AUDIT-{SEQ:4}' },
    { field: 'sequence_width', value: 0 },
  ],
}, 400);
let systemConfigCrudRoundtrips = 0;
for (const config of [
  { scope: 'shipment_type', sourceId: 'shipment_types', code: 'AUDIT-SHIP', name: 'Audit shipment type' },
  { scope: 'trip_status', sourceId: 'trip_statuses', code: 'AUDIT-TRIP', name: 'Audit trip status' },
  { scope: 'fee_rule', sourceId: 'fee_rules', code: 'AUDIT-FEE', name: 'Audit fee rule' },
  { scope: 'storage', sourceId: 'storage_configs', code: 'AUDIT-STORAGE', name: 'Audit storage config' },
] as const) {
  const created = await patchRequest({
    table: 'system_configs',
    action: 'insert',
    scope: config.scope,
    changes: [
      { field: 'code', value: config.code },
      { field: 'name', value: config.name },
      { field: 'config_value', value: 'audit-value' },
      { field: 'status', value: 'Active' },
    ],
  }, 201) as { id?: string };
  if (!created.id) throw new Error(`${config.scope} create did not return an id`);
  const listed = await querySource(config.sourceId, headers);
  if (!(listed.data as any[]).some((row) => row.code === config.code)) {
    throw new Error(`${config.scope} list did not expose the created record`);
  }
  await patchRequest({
    table: 'system_configs',
    action: 'update',
    scope: config.scope,
    id: created.id,
    changes: [{ field: 'name', value: `${config.name} updated` }],
  }, 200);
  await patchRequest({
    table: 'system_configs',
    action: 'delete',
    scope: config.scope,
    id: created.id,
    changes: [],
  }, 200);
  systemConfigCrudRoundtrips++;
}
const codeRulePreview = await fetch(`${baseUrl}/api/actions/system.code_rules.preview`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ id: 'sys-01' }),
});
if (!codeRulePreview.ok) throw new Error(`code rule preview expected 200, got ${codeRulePreview.status}`);
const codeRulePreviewBody = await codeRulePreview.json() as { preview?: string };
if (!codeRulePreviewBody.preview?.startsWith('DH-')) throw new Error(`code rule preview missing generated prefix: ${JSON.stringify(codeRulePreviewBody)}`);
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
for (const pageId of ['system-activity', 'schedule']) {
  const pagePermissionResponse = await fetch(`${baseUrl}/api/pages/${pageId}`, { headers });
  if (pagePermissionResponse.status !== 403) {
    throw new Error(`direct ${pageId} page access expected 403, got ${pagePermissionResponse.status}`);
  }
}
await expectActionRejected('orders.submit_for_approval', { id: 'order-01' }, 403);
console.log(`workflow_transitions=${checks.length} rejected_transitions=${rejected.length} validation_rejections=${validationRejections.length} builder_crud_roundtrips=${2 + systemConfigCrudRoundtrips} system_config_crud_roundtrips=${systemConfigCrudRoundtrips} builder_reorder_roundtrips=2 invalid_imports=1 invalid_catalog_values=2 code_rule_previews=1 xlsx_roundtrips=1 contract_documents=1 company_documents=1 crm_entity_updates=${crmEntityUpdates} financial_detail_updates=${financialDetailUpdates} order_detail_updates=${orderDetailUpdates} permission_denials=3 role_scope_updates=9 dashboard_scope_fields=${reducedDashboardFields} crm_scope_fields=${reducedCrmFields} report_scope_fields=4 activity_scope_denials=1 storage_scope_denials=1 role_scope_denials=1 org_relation_denials=2 scope_mutation_denials=2 scope_crm_mutation_denials=2 scope_hr_mutation_denials=1 scope_accounting_mutation_denials=1 scope_commercial_mutation_denials=2 scope_catalog_mutation_denials=2 scope_detail_denials=6 scope_visibility_denials=1 chat_membership_denials=1 area_hierarchy_rejections=2 ledger_hierarchy_rejections=1 accounting_link_rejections=1 failures=0`);
