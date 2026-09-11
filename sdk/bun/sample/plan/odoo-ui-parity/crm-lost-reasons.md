# CRM parity batch: Pipeline / Lost Reasons

Status: implemented in isolated worktree `agent/odoo-ui-crm-lost-reasons-20260911`.

## Bounded action selected

The single selected visible action is Odoo 19 CRM → Configuration → Pipeline → Lost Reasons (`crm.crm_lost_reason_action`, live action id `364`). The Odoo source contract is `addons/crm/views/crm_lost_reason_views.xml`: searchable name/active list, inline name editing, form detail, Leads stat action, archive/restore, and delete.

The live Odoo 19 user stack was checked in database `core3_user_demo`: CRM is installed at `19.0.1.9`, action 364 is a `crm.lost.reason` list/form action, and the active reference rows are `Too expensive`, `We don't have people/skills`, and `Not enough stock`. Current Core3 source/history had no dedicated Lost Reasons route/menu/action; its existing combined configuration catalog was left unchanged.

## Core3 contract and implementation

- List page id `crm-lost-reasons`, route `/crm/lost-reasons`, and page-local API `crm-lost-reasons` are separate from the detail page/API.
- Detail page id `crm-lost-reason-detail` is provided by `pages/crm-lost-reason-detail.yaml`; its API uses a single-record datasource and binds through the matching page id.
- The manifest owns the CRM Configuration → Pipeline → Lost Reasons menu entry.
- Migration `20260911160000-019-lost-reasons.yaml` is idempotent and seeds deterministic active and archived rows aligned with the live Odoo reference.
- `crm.manage` gates list/form mutations; list, search, CRUD, archive/restore, delete-in-use, duplicate/name validation, stale-row concurrency, empty/no-result, and transport-error boundaries are covered by the focused integration test.

## Browser evidence

Authenticated screenshots were captured at both requested viewports. All images remain under `/tmp` and are intentionally not committed.

| Surface | Desktop 1440×900 | Mobile 390×844 |
| --- | --- | --- |
| Odoo list | `/tmp/odoo-crm-lost-reasons/odoo-lost-reasons-list-desktop.png` | `/tmp/odoo-crm-lost-reasons/odoo-lost-reasons-list-mobile.png` |
| Odoo detail | `/tmp/odoo-crm-lost-reasons/odoo-lost-reason-detail-desktop.png` | `/tmp/odoo-crm-lost-reasons/odoo-lost-reason-detail-mobile.png` |
| Core3 list | `/tmp/core3-odoo-parity/crm-lost-reasons-20260911/core3-lost-reasons-list-desktop.png` | `/tmp/core3-odoo-parity/crm-lost-reasons-20260911/core3-lost-reasons-list-mobile.png` |
| Core3 detail | `/tmp/core3-odoo-parity/crm-lost-reasons-20260911/core3-lost-reason-detail-desktop.png` | `/tmp/core3-odoo-parity/crm-lost-reasons-20260911/core3-lost-reason-detail-mobile.png` |

The final authenticated captures show the three active rows, the Too expensive detail, the Leads count, responsive list behavior, and no horizontal viewport overflow. The Core3 Fluent shell and Odoo purple shell remain intentionally product-specific; the bounded comparison checked route content, hierarchy, controls, density, and responsive behavior. The final run had no page errors or unexpected request failures.

## Verification

Final focused gate before this evidence commit:

```text
bun test test/crm_lost_reasons.integration.test.ts
3 pass, 0 fail, 31 expect() calls
git diff --check
```

The contract, implementation, route/detail cleanup, and evidence are split across commits `9b1b0fa5`, `d05d7595`, `e19fbb11`, and the documentation commit containing this record.
