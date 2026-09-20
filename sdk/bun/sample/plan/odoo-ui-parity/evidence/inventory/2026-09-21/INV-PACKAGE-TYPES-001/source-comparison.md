# Odoo source comparison

Source checkout: `/home/nhanjs/projects/odoo`, Odoo 19 Community stock addon.

## Menu and action

- `addons/stock/views/stock_package_type_view.xml:87-96` defines
  `action_package_type_view` for `stock.package.type` and the
  `menu_packaging_types` item named **Package Types** under **Delivery**.
- The menu is gated by `stock.group_tracking_lot`; its parent Delivery menu is
  gated by `stock.group_stock_manager`.
- The list view at `:70-85` is ordered by sequence and exposes name, height,
  width, packaging length, max weight, computed Has Contents, and barcode.
- The form at `:4-68` has Configuration, Dimensions, and Capacity tabs.

## Model and constraints

- `addons/stock/models/stock_package_type.py:7-39` defines the model and fields:
  name, sequence, barcode, company, package use, dimensions, base/max weight,
  computed contents, storage-category capacities, and routes.
- `:41-59` requires a globally unique barcode and nonnegative height, width,
  length, and max weight. Core3 preserves these constraints and adds explicit
  company and optimistic row-version guards for the shared service contract.
- Core3 maps the model to `inventory_package_types`; page YAML is in
  `services/inventory/pages/package-types.yaml` and
  `pages/package-type-detail.yaml`, while backend datasources/actions are in
  `services/inventory/api/package-types.yaml` and
  `api/package-type-detail.yaml`, joined only by matching `page.id`.

## Deliberate scope boundary

The slice covers the source list/form, package use, barcode, dimensions,
capacity read-through, contents/usage guards, company visibility, manager CRUD,
and restart persistence. It does not duplicate completed package transfer or
package relocation workflows. Odoo sequence-code/ir.sequence creation and
many2many route editing remain represented as read-only route usage/count
context in this bounded slice.
