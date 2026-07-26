# Accounting document lifecycle controls

## Workflow inventory

- Debit notes and payment requests: Draft, Pending Approval, Approved, Paid,
  and Cancelled.
- Advances and settlements: Draft, Pending Approval, Approved, and Cancelled.
- Rejection returns a pending document to Draft.
- Writers can submit or cancel; approvers can approve or reject; payers can
  mark approved debit notes and payment requests as paid.
- Status is omitted from create/edit forms and rejected by generic
  `/api/patch` calls.

The reference default, filter-open, editor-open, and approval states still need
to be captured from the read-only tenant before final visual-parity signoff.

## Local interaction checklist

- [x] Debit note, payment request, advance, and settlement rows expose only
  actions valid for their current state.
- [x] Accountant can submit and cancel but cannot see or invoke approval/payment
  controls.
- [x] Admin can approve, reject, cancel, and mark eligible documents as paid.
- [x] Client-supplied target states are ignored by named actions.
- [x] Repeated or kind-mismatched transitions return `409` or `404`.
- [x] Generic status updates return `400`.
- [x] Generic edits/deletes of non-Draft financial documents return `409`.
- [x] Invoice-template status remains editable as master-data state.
- [x] Financial transitions atomically persist actor, action, resource,
  resource ID, and previous/next status detail in `system_activity`.
- [x] Paid and Cancelled states are represented in detail and summary filters.
- [x] Currency amounts are grouped and aligned without duplicating the currency
  code.
- [x] Mouse activation confirms approval and refreshes the row actions in place.
- [x] 1440 x 1000 and 1024 x 768 have no document/outlet overflow; the dense
  grid owns horizontal scrolling.
- [x] Browser console contains no errors after clean reload.

## Local evidence

- `local-desktop.png`: 1440 x 1000 approved and paid debit-note states.
- `local-tablet.png`: 1024 x 768 with contained horizontal grid scrolling.
