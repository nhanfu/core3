# Functionality checklist

- [x] `/expenses` exposes a visible Activity tab alongside List and Kanban.
- [x] Activity columns match Odoo: To-Do, Email, Call, Meeting, Expense
  Approval, and Document.
- [x] Activity rows use the durable scheduled-activity datasource, including
  type, summary, deadline, assignee, state, and count.
- [x] Existing expense search/status/payment filters remain part of the same
  datasource contract.
- [x] A scheduled activity renders as a planned/overdue/today/done cell and
  the expense record remains navigable through the shared row action.
- [x] Empty and transport-error states are explicit and deterministic.
- [x] No new schema or page-local fixture was introduced; the existing
  activity migration and restart coverage remain authoritative.
- [ ] Authenticated Core3 desktop/mobile capture: blocked for this handoff
  because the BrowserSkill session was closed before a Core3 capture.
