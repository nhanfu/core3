# INV-PRODUCT-MOVES-001 — Product form Stock Moves

Bounded feature: Odoo `product.template` form `action_view_stock_move_lines` opens the Moves History action scoped to every variant of the selected product template.

Core3 adds the stable `view_inventory_product_template_moves` stat action to the Product detail page and passes `product_template_id` into the existing, read-only Moves History datasource. The relation migration is idempotent and keeps the existing global report unchanged.

Visual status: blocked. BrowserSkill connected to shared instance `245ea108`, but borrowing the authenticated Odoo tab timed out awaiting extension confirmation. No desktop/mobile visual-parity claim is made and no screenshot is represented as authenticated evidence.
