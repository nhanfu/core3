# Orders parity controls

## Workflow inventory

- Draft: edit, submit for approval, cancel, delete.
- Pending Approval: approve or reject for users with `orders.approve`; cancel
  for users with `orders.write`.
- Approved: cancel.
- Cancelled: terminal.
- Rejection returns an order to Draft and remains visible in the activity log.
- Status is never supplied by the create/edit form or accepted by generic
  `/api/patch` calls.

The reference default, filter-open, and editor-open screenshots still need to
be recaptured from the read-only tenant before final visual-parity signoff.

## Local interaction checklist

- [x] The page header renders `Quản lý › Đơn hàng` above the list controls.
- [x] `+ Thêm đơn hàng` shares the page-header row and is right aligned.
- [x] The grid renders selection, row number, then business order code as `Mã HT` in the reference order.
- [x] Order code and customer name render as separate reference columns.

- [x] Advanced filters start collapsed behind the shared filter icon; help opens contextual list guidance.

- [x] Draft, pending, and approved rows render only state-valid actions.
- [x] Dispatcher approval receives `403` and cannot see approval controls.
- [x] Admin receives `orders.approve` and sees approve/reject controls.
- [x] Submit for approval moves Draft to Pending Approval.
- [x] Approve moves Pending Approval to Approved.
- [x] Reject moves Pending Approval back to Draft.
- [x] Cancel moves Draft, Pending Approval, or Approved to Cancelled.
- [x] Repeating an invalid transition returns `409`.
- [x] A client-supplied target status is ignored by named actions.
- [x] Generic status updates return `400`.
- [x] Generic edits/deletes of non-Draft orders return `409`.
- [x] Transitions atomically persist actor, action, resource, resource ID, and
  previous/next status detail in `system_activity`.
- [x] Generic create/update/delete calls emit activity records.
- [x] Mouse activation confirms the transition and refreshes the row in place.
- [x] 1440 x 1000 and 1024 x 768 have no document/outlet overflow; the dense
  grid owns horizontal scrolling.
- [x] Browser console contains no errors after transition and refresh.
- [x] Operations navigation exposes the six reference entries: orders, trips,
  vehicle dispatch, chat, schedule, and reports.
- [x] Lifecycle tabs show datasource-backed counts for all, draft, approval,
  approved, and cancelled orders.
- [x] Counts are returned by a server facet query and remain correct independently of the 50-row page size.
- [x] Shared DataGrid keeps list rows dense with single-line truncation for long
  customer, route, and metadata cells while retaining horizontal overflow.
- [x] Pagination defaults to 50 rows and offers server-backed 10/25/50/100 page-size choices.

## Local evidence

- `local-desktop.png`: 1440 x 1000 after submission.
- `local-tablet.png`: 1024 x 768 after submission.
