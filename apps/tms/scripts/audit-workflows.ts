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
console.log(`workflow_transitions=${checks.length} rejected_transitions=${rejected.length} validation_rejections=${validationRejections.length} crud_roundtrips=1 invalid_imports=1 xlsx_roundtrips=1 contract_documents=1 company_documents=1 permission_denials=1 currency_sync=1 role_scope_updates=2 failures=0`);
