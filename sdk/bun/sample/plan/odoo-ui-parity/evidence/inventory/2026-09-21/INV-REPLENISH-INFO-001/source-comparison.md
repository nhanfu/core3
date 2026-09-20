# INV-REPLENISH-INFO-001 source comparison

## Odoo source and action

- `addons/stock/views/stock_orderpoint_views.xml:24-63` defines the orderpoint list action `action_stock_replenishment_info` and the warning variant titled **Replenishment Information**.
- `addons/stock/views/stock_orderpoint_views.xml:143` exposes the **Forecast Description** action.
- `addons/stock/wizard/stock_replenishment_info.xml:3-61` defines the transient information form: minimum/maximum quantities, lead days, demand basis, forecast graph, warehouse options, Save and Close.
- `addons/stock/wizard/stock_replenishment_info.py:16-193` computes demand, lead-time and min/max context; lines 196-267 provide replenishment route/order options.
- `addons/stock/models/stock_orderpoint.py:328-340` creates the transient information record and derives the product/warehouse title.

The paired Core3 implementation keeps `pages/replenishment-info.yaml` layout-only and joins it to `api/replenishment-info.yaml` through `page.id: replenishment-info`. The source-backed page provides product/warehouse forecast context, a demand chart, durable report-open history, route options, and a Save Rule form. Migration `20260921160000-042-inventory-replenishment-info.yaml` provides deterministic demand and run fixtures.

## Browser comparison

Authenticated Core3 desktop/mobile captures are in this directory. Odoo rendered the authenticated Replenishment desktop and mobile screens, but the reachable account exposed only Order, Automate and Snooze; the source Replenishment Information action and transient form were not reachable from those screens. No Odoo mutation was performed. This is a paired reachability blocker, not a claim of Odoo parity sign-off.
