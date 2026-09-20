# Source comparison

| Source behavior | Core3 implementation | Evidence/status |
| --- | --- | --- |
| Physical Inventory menu/server action opens the editable quant list | `pages/physical-inventory.yaml` owns the list layout and the matching API YAML owns `inventory_physical_inventory` | Core3 desktop/mobile and Odoo desktop/mobile captures |
| Apply All opens reason/counting-date wizard | `apply_all_inventory_quantities` is an API-owned `server_form` action with `inventory_adjustment_name` and `counting_date` fields | desktop modal capture and focused test |
| Only counted quants are applied | mutation filters `inventory_quantity_set AND counted_quantity IS NOT NULL`; uncounted rows remain unchanged | focused counted-only assertion and after-apply capture |
| Inventory adjustment is durable and creates move history | migration `0.0.26` adds `inventory_adjustments`; mutation inserts non-zero `inventory_move_lines` | focused restart and side-effect assertions |
| Odoo action is permissioned for stock users/managers | Core3 enforces `inventory.read`, `inventory.write`, and manager-only row actions | focused runtime permission test |

Residual source behavior is intentionally outside this slice: Odoo conflict
resolution for `is_outdated`, Reset/Clear and Relocate flows, Request a Count,
import/export, and the complete row-history presentation.
