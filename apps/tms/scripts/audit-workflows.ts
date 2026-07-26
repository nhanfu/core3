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

// These records are consumed only on a disposable freshly seeded database.
const checks = [
  ['orders.submit_for_approval', 'order-01', 'Pending Approval'],
  ['orders.approve', 'order-01', 'Approved'],
  ['quotes.send', 'quote-02', 'Sent'],
  ['quotes.accept', 'quote-02', 'Accepted'],
  ['accounting.debit_notes.submit_for_approval', 'acct-debit-01', 'Pending Approval'],
  ['accounting.debit_notes.approve', 'acct-debit-01', 'Approved'],
  ['accounting.debit_notes.mark_paid', 'acct-debit-01', 'Paid'],
  ['accounting.payment_requests.submit_for_approval', 'acct-pay-03', 'Pending Approval'],
  ['accounting.payment_requests.approve', 'acct-pay-03', 'Approved'],
  ['accounting.payment_requests.mark_paid', 'acct-pay-03', 'Paid'],
  ['hr.payroll.approve', 'payroll-04', 'Approved'],
  ['hr.payroll.mark_paid', 'payroll-04', 'Paid'],
  ['trips.cancel', 'trip-07', 'Cancelled'],
] as const;

for (const [action, id, expected] of checks) await transition(action, id, expected);
console.log(`workflow_transitions=${checks.length} failures=0`);
