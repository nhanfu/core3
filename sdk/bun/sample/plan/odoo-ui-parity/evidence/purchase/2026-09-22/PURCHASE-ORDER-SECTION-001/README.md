# Purchase Order Add a section — `PURCHASE-ORDER-SECTION-001`

Bounded feature: Odoo Purchase Order Products-tab `Add a section` control.

Core3 adds the page/API-matched `add_purchase_order_section` server form to the
existing `purchase-detail` page. It persists a zero-total `line_section` order
line, increments the parent row version atomically, and supports guarded edit
and delete actions for section rows. Product line actions reject display lines.

## Evidence boundary

Local source comparison:

- `/home/nhanjs/projects/odoo/addons/purchase/views/purchase_views.xml:250-253`
- `/home/nhanjs/projects/odoo/addons/purchase/models/purchase_order_line.py`
- Core3 `services/purchase/pages/purchase-detail.yaml`
- Core3 `services/purchase/api/purchase-detail.yaml`

BrowserSkill instance `245ea108` was connected, but the required signed-in Odoo
tab borrow did not complete. The request for user tab `1770662590` remained
pending until the timeout; the tab stayed in user scope. The owned session was
stopped. No Odoo tab was borrowed or returned, no desktop/mobile screenshot was
captured, and no visual-parity claim is made.

No credentials, cookies, tokens, or screenshots are committed.
