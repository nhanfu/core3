# MANUFACTURING-MO-BACKORDERS-001

## Bounded slice

Implemented the Odoo Manufacturing Order form stat action
`action_view_mrp_production_backorders` from
`addons/mrp/models/mrp_production.py`. Odoo returns the `mrp.production` rows
in the selected `production_group_id` with `list,form` modes and the label
`Backorder MO's`. Core3 now persists `backorder_group_id`, exposes the
`Backorders` stat on the Manufacturing Order form when the group has at least
two records, and routes to the scoped read-only list/form contract.

## Source evidence

- Odoo source: `/home/nhanjs/projects/odoo/addons/mrp/models/mrp_production.py`
  (`action_view_mrp_production_backorders` and the computed count) and
  `addons/mrp/views/mrp_production_views.xml` (stat button).
- Core3 page/API split: `services/manufacturing/pages/production-backorders.yaml`
  and `services/manufacturing/api/production-backorders.yaml`.
- Durable migration: `services/manufacturing/migrations/20260922210000-028-production-backorders-index.yaml`.
- Focused test: `test/manufacturing_production_backorders.integration.test.ts`.

## Browser boundary

BrowserSkill daemon instance `245ea108` was healthy. The shared authenticated
Odoo tab `1770662590` was listed at `http://localhost:8069/odoo/contacts/9`,
but the single explicit borrow request did not transfer the tab before the
confirmation timeout. The tab was not navigated, no credentials or browser
secrets were read, no Playwright or independent login was used, and the
BrowserSkill session was stopped. No Odoo desktop/mobile visual-parity claim
is made.

## Verification

The focused test, `bun run audit`, frontend/CSS build, and diff checks are run
for this slice before commit. Full Manufacturing parity remains open.

## Remaining gaps

- Live authenticated Odoo desktop/mobile comparison is blocked by shared-tab
  borrow confirmation.
- The slice does not implement the related Child MO, Source MO, Transfers,
  Traceability, or backorder creation wizard workflows.
- Full Manufacturing permissions, integrations, and module sign-off remain
  open.
