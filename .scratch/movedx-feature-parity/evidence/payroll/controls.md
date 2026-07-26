# Payroll lifecycle controls

## Workflow inventory

- Draft: HR officers can edit or delete; approvers can approve.
- Approved: approvers can reopen; payers can confirm payment.
- Paid: terminal.
- Status is omitted from create/edit forms and rejected by generic
  `/api/patch` calls.

The matching reference default, editor, approved, and paid captures still need
to be collected before final visual-parity signoff.

## Local interaction checklist

- [x] HR officer has `hr.read` and `hr.write`, but not `hr.approve` or `hr.pay`.
- [x] HR officer cannot invoke or see approval/payment actions.
- [x] Admin can approve, reopen, and mark eligible payroll records as paid.
- [x] Client target states are ignored and invalid repeated transitions return
  `409`.
- [x] Non-Draft payroll records cannot be generically edited or deleted.
- [x] Transition audit records retain actor, action, resource, resource ID, and
  previous/next state detail.
- [x] Limited-role login lands on an authorized module instead of the
  fleet-only dashboard.
- [x] Month and money values render as date-only and grouped numeric values.
- [x] 1440 x 1000 and 1024 x 768 have no document overflow; the tablet grid
  owns horizontal scrolling.
- [x] Clean payroll navigation has no failed requests or console errors.

## Local evidence

- `local-desktop.png`: 1440 x 1000 with Draft, Approved, and Paid rows.
- `local-tablet.png`: 1024 x 768 with contained horizontal grid scrolling.
