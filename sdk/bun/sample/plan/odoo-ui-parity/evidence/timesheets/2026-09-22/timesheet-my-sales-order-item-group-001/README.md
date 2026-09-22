# `TIMESHEET-MY-SALES-ORDER-ITEM-GROUP-001`

## Source contract

The local Odoo 19 source at `/home/nhanjs/projects/odoo` defines the
Sales Timesheet search filter `groupby_sale_order_item` on the inherited
Timesheets search view. Its context groups `account.analytic.line` by
`so_line` and is limited to `sales_team.group_sale_salesman`.

## Core3 bounded slice

- `pages/entries.yaml` exposes `Sales Order Item` in My Timesheets Group By.
- `api/entries.yaml` declares the durable `sales_order_item` pivot field and
  its `timesheet_entries.sales_order_item` group contract.
- The existing Timesheets migration `0.0.6` already owns and seeds this
  durable relation; no duplicate migration was added.
- The page/API remain separate and are joined by `page.id: timesheets`.

## Verification

Focused command:

```sh
bun test test/timesheets_my_sales_order_item_group.integration.test.ts --timeout 30000
```

The test covers the Odoo source mapping, durable grouping, actor/company and
empty guards, concurrent refresh, migration replay, and file-backed restart.

BrowserSkill was started against the shared BrowserSkill instance and one
explicit borrow request was issued for the existing authenticated Odoo tab
`1770662590`. The tab remained owned by another session and the confirmation
did not complete, so no Odoo interaction or visual-parity claim is made.

Remaining gaps include the Odoo sales-group permission boundary in the Core3
permission catalog, Invoice grouping, Sales Order Item action parity beyond
the existing bounded route, and authenticated Core3 desktop/mobile evidence.
