# Inventory Rules — `INV-RULES-001`

Date: 2026-09-22

## Odoo source

- Addon: `stock`, Odoo 19 Community source at `/home/nhanjs/projects/odoo`.
- Action: `stock.action_rules_form`, `addons/stock/views/stock_rule_views.xml:110-114`.
- Menu: `stock.menu_action_rules_form`, same file `:116-117`, under
  `menu_warehouse_config`, restricted to `stock.group_adv_location`.
- Views: list `:23-36` with Action, Source Location, Destination Location,
  Route, Company, and optional Name; form `:38-90` with active state, action,
  operation type, locations, route, supply method, trigger, company, sequence,
  and delay options. Search includes Name, Archived, Route, Destination
  Location, and Warehouse filters (`:6-20`).

## Core3 gap before this slice

Core3 had `services/inventory/pages/routes.yaml` and the matching
`api/routes.yaml`, plus a route-detail read-only `inventory_route_rules` list.
It did not expose the standalone Rules menu/action, did not have rule name or
active lifecycle fields, and did not provide rule CRUD, stale-row, company, or
permission guards for the `stock.rule` surface.

## Bounded implementation

- `pages/rules.yaml` and `api/rules.yaml` are joined by `page.id: rules`.
- `pages/rule-detail.yaml` and `api/rule-detail.yaml` are joined by
  `page.id: rule-detail`.
- Migration `20260922390000-089-inventory-rules.yaml` adds durable rule form
  fields to the existing route-rule table, backfills deterministic fixtures,
  and adds an active/sequence index.
- `manifest.yaml` adds Configuration > Warehouse Management > Rules with the
  `inventory.multi_location` boundary; management mutations require
  `inventory.manage`.
- Create/edit validates names, action values, distinct locations, active route,
  company scope, duplicate active names, row versions, archive/restore state,
  and missing records. List and detail datasources expose empty, not-found, and
  503 transport contracts.

## Evidence disposition

The focused Core3 contract suite passed 4 tests / 29 assertions. BrowserSkill
connected to shared Chrome instance `245ea108` and listed the authenticated
Odoo tab, but the required borrow confirmation did not complete before the
borrow request expired. Therefore no live Odoo Rules screenshot or visual
parity claim is made for this slice. See `browser-blocker.md`.
