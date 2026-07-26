const baseUrl = (process.env.TMS_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
const login = await fetch(`${baseUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ email: process.env.TMS_AUDIT_EMAIL || 'admin@tms.local', password: process.env.TMS_AUDIT_PASSWORD || 'admin123' }),
});
if (!login.ok) throw new Error(`login failed: ${login.status}`);
const { token } = await login.json() as { token: string };
const headers = { Authorization: `Bearer ${token}`, 'content-type': 'application/json' };

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
console.log(`workflow_transitions=${checks.length} rejected_transitions=${rejected.length} validation_rejections=${validationRejections.length} failures=0`);
