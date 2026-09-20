# Units & Packagings source comparison

## Odoo source

- `addons/stock/views/stock_menu_views.xml:20-34` places
  `menu_stock_uom_form_action` under Inventory → Configuration → Products,
  names it `Units & Packagings`, points it to `uom.product_uom_form_action`,
  and requires `uom.group_uom`.
- `addons/uom/views/uom_uom_views.xml:3-13` defines the list columns sequence,
  name, relative factor, and relative reference unit. Lines 15-39 define the
  form fields name, quantity/relative factor, and reference unit; lines 42-61
  define the search view and `product_uom_form_action`.
- `addons/uom/models/uom_uom.py:17-47,97-104` defines `uom.uom` name, sequence,
  relative factor, active state, reference relationship, non-zero factor
  constraint, and the requirement that non-reference units point to a
  reference unit. The model protects system-used units from deletion.

## Core3 mapping

- `pages/units-packagings.yaml` and `api/units-packagings.yaml` are separate;
  both declare `page.id: units-packagings`. The detail pair uses
  `unit-packaging-detail` and adds a reference-child datasource.
- Migration `0.0.48` stores conversion factors, reference IDs/names, active
  state, company scope, usage count, and row versions. Fixtures include base
  units, derived packs, a shared unit, and an archived unit.
- The list mirrors source columns and adds mobile cards, active/all filters,
  search, company context, and deterministic reference display. The detail
  form exposes quantity, reference unit, sequence, usage, and guarded lifecycle
  actions.
- `inventory.read` protects reads and `inventory.manage` protects create/edit,
  archive/restore/delete. Mutations enforce positive factors, valid
  references, no self-reference, current-company writes, duplicate names,
  in-use/archive/delete protection, dependent reference protection, and row
  version concurrency.

The Inventory route is intentionally separate from the existing Purchase
Units & Packagings implementation; no Purchase paths were changed.
