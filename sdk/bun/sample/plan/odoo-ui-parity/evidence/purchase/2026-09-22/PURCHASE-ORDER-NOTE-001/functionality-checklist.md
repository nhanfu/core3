# Functionality checklist — `PURCHASE-ORDER-NOTE-001`

| Stable requirement | Result |
| --- | --- |
| Products-tab `Add a note` control | Implemented in shared LineItemGrid |
| Page/API separation | `purchase-detail` page and API share `page.id`; page remains layout-only |
| Purchase write permission | `purchase.write` on create/edit/delete; read remains `purchase.read` |
| Durable stable line identity | `purchase-note-<order>-<sequence>` plus seeded fixture |
| Draft/Sent and unlocked guard | Implemented with parent row-version check |
| Zero-total note semantics | Implemented; totals and quantity remain unchanged |
| Edit/delete note | Implemented with line and parent stale guards |
| Invalid/stale/locked/non-note guards | Focused-test covered |
| Migration replay/restart | Focused-test covered for `0.0.34` |
| Authenticated Odoo/Core3 desktop/mobile evidence | Blocked by BrowserSkill tab borrow; no visual claim |
