# FORUM-CONFIG-001 — Forum configuration form

Date: 2026-09-21
Status: Core3 contract pass; browser visual pairing conditional

## Source trace

- Local Odoo 19 source: `addons/website_forum/views/forum_menus.xml` declares
  `menu_forum_global` → `forum_forum_action` under Website configuration.
- `addons/website_forum/views/forum_forum_views.xml` declares the list view,
  `forum_forum_view_form_add` create modal, `forum_forum_view_form` edit form,
  archived search filter, and the `list,form` action.
- `addons/website_forum/models/forum_forum.py` declares required unique `name`,
  mode/privacy/default ordering, durable description and active state.

## Core3 contract evidence

- Presentation/API separation: `pages/forums.yaml` and
  `pages/forum-detail.yaml` contain layout only; `api/forums.yaml` and
  `api/forum-detail.yaml` own datasources/actions and join by matching
  `page.id`.
- Durable migration: `services/forum/migrations/20260921100000-006-forum-config-schema.yaml`
  adds sequence, website, and default-sort columns and backfills existing rows.
- Create/edit mutation guards cover required name, case-insensitive duplicate
  names, optimistic `row_version`, and atomic denormalized post forum-name
  refresh.
- Permission boundary: `forum.write` is rejected at the authenticated action
  route; the same manager actor with `forum.manage` creates the forum and the
  row persists with `active=true`.

## Focused tests

- `bun test ./test/forum_forum_configuration.integration.test.ts` — 4 tests,
  25 assertions, 0 failures, including file-backed restart.
- `bun test ./test/forum*.integration.test.ts` — 17 tests, 133 assertions, 0
  failures (the suite uses a temporary Forum-only app root with the real YAML
  discovery function so unrelated dirty modules cannot change its result).

## Browser evidence

Owned BSK session: `jpue`, browser instance `245ea108`; session stopped after
capture. No credentials, cookies, or tokens were read or stored.

- Odoo authenticated desktop screenshot: `/tmp/core3-odoo-parity/forum-config-20260921/odoo-live-menu-desktop.png`
  (`1916×833`). App launcher contains Discuss, Calendar, To-do, Contacts, CRM,
  Sales, Dashboards, Point of Sale, Invoicing, Project, Timesheets, Events,
  Surveys, Purchase, Inventory, Maintenance, Employees, Expenses, and Apps;
  no Website or Forum entry.
- Odoo authenticated mobile screenshot: `/tmp/core3-odoo-parity/forum-config-20260921/odoo-live-menu-mobile.png`
  (`390×844`). Mobile shell renders without a Website/Forum app entry.
- Core3 desktop route attempt: `/forums` returned browser
  `ERR_CONNECTION_REFUSED`; screenshot:
  `/tmp/core3-odoo-parity/forum-config-20260921/core3-connection-refused-desktop.png`.
- Core3 mobile route attempt: `/forums` returned browser
  `ERR_CONNECTION_REFUSED`; screenshot:
  `/tmp/core3-odoo-parity/forum-config-20260921/core3-connection-refused-mobile.png`.

## Blocker and scope boundary

The Core3 candidate could not start because repository-wide discovery stops on
the pre-existing unrelated Order error `Duplicate datasource id
"sale_quotation_templates" in services/order/pages/sale-quotations.yaml`.
The live `core3_reference` Odoo database does not have `website_forum`
installed, so paired Odoo Forum list/form screenshots and visual sign-off are
blocked. Forum archive/restore is deferred until Core3 models Odoo's separate
`forum.post.active` cascade rather than treating the existing terminal question
`Archived` state as reversible.
