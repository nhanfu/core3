# Functionality checklist

- [x] All operation-card action maps to `stock.stock_picking_action_picking_type`.
- [x] Page/API YAML are separate and joined by `page.id: transfer-all`.
- [x] Selected operation type and current-company context scope rows.
- [x] List and mobile card states expose reference, operation type, contact,
  date, source document, operations, status, and company.
- [x] Search, state, operation-kind, group-by, empty, no-result, and 503
  transport states are declared and tested.
- [x] Row navigation opens the existing guarded transfer detail contract.
- [x] Refresh persists actor/company/operation context and advances a queue
  row version with stale and scope guards.
- [x] `inventory.read` protects page, sources, navigation, and refresh.
- [x] Migration replay and file-backed restart preserve queue history.
- [ ] Authenticated desktop/mobile visual comparison; blocked by browser tab
  borrowing/runtime availability and intentionally not marked pass.
