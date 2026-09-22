# Purchase Order Add a note — `PURCHASE-ORDER-NOTE-001`

Bounded feature: Odoo Purchase Order Products-tab `Add a note` control.

Core3 adds the page/API-matched `add_purchase_order_note` server form to the
existing `purchase-detail` page. It persists a zero-total `line_note` order
line and supports guarded edit/delete actions for note rows. Product and
section actions remain type-specific.

## Evidence boundary

Local source comparison:

- `/home/nhanjs/projects/odoo/addons/purchase/views/purchase_views.xml:250-253`
- `/home/nhanjs/projects/odoo/addons/purchase/models/purchase_order_line.py:28-36,91-104,287-307`
- Core3 `services/purchase/pages/purchase-detail.yaml`
- Core3 `services/purchase/api/purchase-detail.yaml`

BrowserSkill instance `245ea108` was connected. The required signed-in Odoo
tab `1770662590` was requested for borrowing in session `cqvt`, but the borrow
confirmation did not complete. A subsequent tab listing showed the tab still
in user scope, so the session was stopped without a borrowed tab. No Odoo or
Core3 desktop/mobile screenshot was captured and no visual-parity claim is
made.

No credentials, cookies, tokens, or screenshots are committed.
