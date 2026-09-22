# Functionality checklist

- [x] Stable page/API binding remains `page.id: sale-order-detail`.
- [x] Permission is `orders.read`; the action is not exposed as an unauthenticated mutation.
- [x] Draft/quotation, sent quotation, and cancelled order states prepare PDF metadata.
- [x] Confirmed Sales Order state is rejected without a print run.
- [x] Missing, wrong-branch, stale-row, and blank-actor guards reject without partial writes.
- [x] Report action/template/format/actor metadata is durable.
- [x] Order status and row version remain unchanged by printing.
- [x] Migration replay and file-backed restart retain exactly one print history row.
- [ ] Authenticated desktop/mobile visual comparison — blocked by BrowserSkill tab ownership.
