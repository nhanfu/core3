# Functionality checklist

- [x] Stable action ID mapped to Odoo `action_preview_sale_order`.
- [x] Separate page/API YAML ownership joined by `page.id`.
- [x] Preview action visible from the dedicated Sales order form.
- [x] Read-only order/customer/date/terms content.
- [x] Read-only order-line, discount, tax, amount, and total content.
- [x] `Back to edit mode` navigation.
- [x] `orders.read` page/source/action permission declarations.
- [x] Branch scope prevents cross-branch preview reads.
- [x] Missing record and transport-error contracts declared.
- [x] Empty order-line state declared.
- [x] Idempotent migration replay and file-backed reopen test.
- [ ] Authenticated Odoo desktop capture; blocked by borrowed tab.
- [ ] Authenticated Odoo mobile capture; blocked by borrowed tab.
- [ ] Paired authenticated Core3 desktop/mobile visual comparison; no claim.
