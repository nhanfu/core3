# Functionality checklist — `PURCHASE-ORDER-SECTION-001`

| Stable requirement | Result |
| --- | --- |
| Products-tab `Add a section` control | Implemented in shared LineItemGrid |
| Page/API separation | `purchase-detail` page and API share `page.id`; page remains layout-only |
| Purchase write permission | `purchase.write` on create/edit/delete; read remains `purchase.read` |
| Durable stable line identity | `purchase-section-<order>-<sequence>` plus seeded fixture |
| Draft/Sent and unlocked guard | Implemented with parent row version check |
| Zero-total section semantics | Implemented; totals and quantity remain unchanged |
| Edit/delete section | Implemented with line and parent stale guards |
| Empty/invalid/stale/locked/non-section guards | Focused-test covered |
| Migration replay/restart | Focused-test covered for `0.0.33` |
| Authenticated Odoo/Core3 desktop/mobile evidence | Blocked by BrowserSkill tab borrow; no visual claim |
