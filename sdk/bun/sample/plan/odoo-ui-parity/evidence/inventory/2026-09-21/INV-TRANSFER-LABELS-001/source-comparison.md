# INV-TRANSFER-LABELS-001 source comparison

## Odoo source/menu/action

- `addons/stock/views/stock_picking_views.xml:477-487` defines the transfer-bound `action_print_labels` report action named `Labels`, bound to list, kanban, and form views, and calls `records.action_open_label_type()`.
- `addons/stock/models/stock_picking.py:1984-1995` opens the `picking.label.type` wizard when production lots are present, otherwise it opens the product label layout wizard.
- `addons/stock/wizard/stock_label_type.py:7-29` defines the transient wizard with `products` / `Product Labels` and `lots` / `Lot/SN Labels`; Product Labels route to `action_open_label_layout`.
- `addons/stock/wizard/stock_label_type.xml:3-18` defines the radio selection, Confirm, and Cancel modal contract.

## Core3 bounded mapping

- `services/inventory/pages/transfer-detail.yaml` stays presentation-only; the transfer form exposes `Labels` and a label-run history list.
- `services/inventory/api/transfer-detail.yaml` owns the Product Labels/PDF form, `inventory_transfer_label_runs` datasource, and durable mutation.
- `20260921100000-036-inventory-transfer-labels.yaml` adds the report ledger and deterministic Ready transfer fixture `delivery-labels-0001`.
- The bounded branch records quantity, actor, company, row version, and timeline for Product Labels. Lot/SN Labels, downstream layout options, and ZPL remain follow-up scope.

## Evidence disposition

Focused lifecycle evidence is represented by the passing integration suite and durable migration assertions. Authenticated Core3 desktop/mobile capture is blocked at startup by the pre-existing shared discovery error recorded in `blockers.md`; no screenshot is presented as successful UI proof. Odoo visual/action capture was not retried during finalization; no Odoo mutation was attempted.
