# INV-PRODUCT-REPLENISH-001 blockers

- Odoo login succeeded for the supplied authenticated account and both desktop
  (1440x900) and mobile (390x844) captures completed without request/page
  errors or overflow.
- The source audit identifies `/odoo/action-433` as the Products action, but
  the installed authenticated Odoo route resolves `/odoo/action-433` to
  `/odoo/project` (Projects). The resulting surface has no Inventory product
  form, no `Replenish` action, and no `product.replenish` modal to compare.
- This is an exact installed-action/database blocker, not a Core3 runtime
  failure. No Odoo mutation was attempted. Downstream procurement document
  generation remains outside this bounded slice.
