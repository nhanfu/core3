# INV-REPLENISH-INFO-001 blockers

- Odoo desktop and mobile Replenishment routes authenticated and rendered, but the supplied account's reachable list exposed only `Order`, `Automate`, and `Snooze`; `Replenishment Information`/the transient wizard was not visible. Source comparison is therefore exact-source plus rendered-list evidence, not a direct wizard interaction.
- Core3 records the information report and persists the saved rule, but downstream Odoo procurement-rule, purchase-order, or manufacturing generation remains outside this bounded wizard slice.
- Full Inventory module sign-off remains open.
