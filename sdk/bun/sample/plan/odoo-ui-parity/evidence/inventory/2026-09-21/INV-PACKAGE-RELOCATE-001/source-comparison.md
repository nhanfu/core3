# INV-PACKAGE-RELOCATE-001 source comparison

Date: 2026-09-21

## Odoo source/menu/action

- Inventory > Products > Packages is `stock.menu_package` in
  `addons/stock/views/stock_package_views.xml:144-164`, opening
  `stock.action_package_view` with the internal-location context.
- The Package form's editable Location field is in
  `stock_package_views.xml:29-70`. Its model behavior is
  `stock.package.write` in `addons/stock/models/stock_package.py:289-307`:
  empty packages cannot be moved, non-empty packages move contained positive
  quants, and the operation uses the reason `Package manually relocated`.
- The source package surface is tracking-lot gated; Core3 maps the mutation to
  `inventory.write` while retaining the package page's
  `inventory.tracking` visibility boundary.

## Core3 mapping

- `services/inventory/pages/package-detail.yaml` remains layout-only and adds a
  Relocate form action plus a nested relocation-history grid.
- `services/inventory/api/package-detail.yaml` owns destination options,
  company/actor/state/row-version/location guards, durable audit insertion, and
  the package location update. The action is `inventory.packages.relocate`.
- Migration `20260921120000-038-inventory-package-relocations.yaml` adds
  `inventory_package_relocations` and a deterministic Core3-company package
  fixture with two contents so the authenticated browser actor can exercise
  the source behavior without crossing company scope.

The bounded mapping records one package-level relocation audit with the
contained quantity count and updates the durable package location. Quant-level
movement mechanics remain represented by the existing quant relocation slice;
bulk/package-chain movement and empty-package cleanup remain open.

## Comparison disposition

Core3 source contract and authenticated desktop/mobile behavior: PASS. Odoo
live paired relocation execution was not captured in this wave, so no Odoo
mutation or visual parity sign-off is claimed.
