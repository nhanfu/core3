# Odoo 19 UI parity — Marketing Automation source gate

Status: source-limited — the live Odoo 19 reference has no installed
Marketing Automation surface; Core3 implementation is proceeding as an
explicitly synthetic, YAML-first equivalent and must not be described as
source-backed Odoo parity.

Audit date: 2026-09-20

## Parent-plan scope

The module register in `../odoo-parity-plan.md` identifies Marketing
Automation as the Odoo `marketing_automation` module and marks it
`unavailable in supplied source` / `planned`. This audit confirms that gate.
The required Odoo menu, action, view, permission, demo-data, and authenticated
desktop/mobile comparison inventory cannot be completed from the available
local checkouts.

## Exact Odoo source audit

The supplied Odoo checkout is `/home/nhanjs/projects/odoo`, branch `19.0`,
revision `659759969d535d286b656c96b675e4612b925ddd` (`65975996`). The exact
addon and all of its parity-authoritative source areas are absent:

| Checked path | Result |
| --- | --- |
| `/home/nhanjs/projects/odoo/addons/marketing_automation` | missing |
| `/home/nhanjs/projects/odoo/addons/marketing_automation/__manifest__.py` | missing |
| `/home/nhanjs/projects/odoo/addons/marketing_automation/models` | missing |
| `/home/nhanjs/projects/odoo/addons/marketing_automation/views` | missing |
| `/home/nhanjs/projects/odoo/addons/marketing_automation/security` | missing |
| `/home/nhanjs/projects/odoo/addons/marketing_automation/demo` | missing |
| `/home/nhanjs/projects/odoo/addons/marketing_automation/static` | missing |
| `/home/nhanjs/projects/odoo/enterprise/addons/marketing_automation` | missing; no local enterprise tree was found |
| `/home/nhanjs/projects/core3-worktrees/odoo` | missing checkout |

The addon directory does not appear under another marketing/automation name in
the supplied Odoo `addons` tree. Nearby `base_automation`, `utm`, `mail`, and
`mass_mailing` addons are different modules and do not supply the missing
Marketing Automation menus, actions, views, security, assets, or demo records.

Therefore no Odoo addon version metadata, official demo-data declaration,
application menu tree, action identifiers, visibility groups, route/action
contexts, view modes, responsive states, or reference record IDs are asserted
by this plan.

## Live Odoo inventory — 2026-09-20

The authenticated `core3_reference` database at `http://localhost:8069` was
queried before implementation. The module registry contains
`marketing_automation` with state `uninstallable`; `mass_mailing` is
`uninstalled`. No Marketing Automation root or child menu is installed.

The exact matching menu/action inventory is:

| Odoo object | Result |
| --- | --- |
| Marketing Automation application/root | absent |
| Marketing Automation campaigns/journeys/activities menus | absent |
| `marketing_automation` window actions | absent |
| `marketing_automation` models/views | absent from the installed registry |
| Settings → Technical → Automation → Scheduled Actions | present, unrelated (`ir.cron`, action 16) |
| Settings → Technical → Automation → Scheduled Actions Triggers | present, unrelated (`ir.cron.trigger`, action 17) |
| Link Tracker → UTMs → Campaigns | present, unrelated (`utm.campaign`, action 101) |
| Marketing Automation menu tree screenshots | unavailable because the app is not installed |

This is a stronger runtime confirmation of the source gate, not evidence that
the unrelated UTM Campaigns screen is Marketing Automation.

## Current Core3 boundary

Core3 already contains a product-owned, synthetic service at
`sdk/bun/sample/services/marketing-automation/`, registered as
`marketing-automation` at `/automations` in `sdk/bun/sample/config.yaml`. Its
current boundary is:

- `manifest.yaml`: Marketing Automation → Journeys → Automations and
  Automation Analysis;
- `permissions.yaml`: `marketing_automation.read`, `.write`, and `.manage`;
- `pages/automations.yaml`, `automation-detail.yaml`, and `analysis.yaml`:
  list, detail/enrollment, and analysis contracts;
- `pages/automation-workflow.yaml`: Draft, Published, Running, Completed, and
  Paused transitions;
- `migrations/20260819060000-001-automation-foundation.yaml` and
  `20260819061000-002-automation-demo-data.yaml`: synthetic DuckDB schema and
  one deterministic product fixture.

This existing service is not evidence of Odoo parity. Its labels, route,
fields, workflow, fixture, layout, and actions must not be described as copied
or verified from Odoo.

## Current-wave gap matrix and bounded slice

| Capability | Current Core3 state | Current-wave action | Evidence target |
| --- | --- | --- | --- |
| Menu and live reference | Synthetic `/automations`; Odoo surface absent | Keep the explicit source-limited disclosure and Core3 menu | menu contract plus live RPC inventory above |
| Page/API contract boundary | Datasources/actions are embedded in page YAML | Move backend queries/mutations to `api/*.yaml`, joined by `page.id` | discovery contract test |
| Automation definition CRUD | Create exists; update/delete/archive and stale guards do not | Add create/update/archive/restore/delete with validation and row-version concurrency | focused integration test |
| Audience enrollment | Insert exists but trusts caller-supplied automation name and has no stale enrollment guard | Bind enrollment to the selected automation and prevent duplicate contacts per journey | migration/API test |
| Campaign workflow | Publish/run/complete/pause exists | Preserve the workflow, add archive/delete guards and detail/list parity | workflow test |
| Deterministic persistence | One draft fixture, no active/archive or repeatable enrollment fixtures | Add deterministic active, paused, and completed journeys plus enrollments | idempotent migration test |
| Permissions | read/write/manage are declared globally | Keep read-only list/detail, write CRUD/workflow, manage destructive actions | permission/action contract assertions |
| Odoo visual parity | Cannot be truthfully captured while module is unavailable | Capture Core3 desktop/mobile only as product evidence; no paired Odoo claim | authenticated browser QA, if runtime available |

The first implementation slice is **automation definition maintenance and
audience enrollment**. It is meaningful end to end: list/detail data,
validated create/update/delete/archive/restore, deterministic enrollment
records, workflow-safe enrollment, and permission/concurrency boundaries.
Later slices may add activity nodes, scheduling, retries, and reporting only
after an authoritative Odoo source or installed reference becomes available.

## Capture/runtime audit

No parity captures are produced. The Odoo listeners at `127.0.0.1:8073` and
`:8069` respond with redirects, but there is no installed/source-backed
`marketing_automation` surface to authenticate into or compare. The expected
Core3 parity runtime at `127.0.0.1:32615` and the local development port
`:3000` had no listener. The available browser executable is
`/usr/bin/google-chrome`; the authenticated target surfaces required for a
truthful capture were not available.

Consequently, no images were written under `/tmp/core3-odoo-parity`, and no
desktop `1440x900` or mobile `390x844` visual-parity claim is made for either
Odoo or Core3. A future audit must capture both surfaces only after the exact
addon/source and an authenticated Core3 runtime are available.

## Dependency / next gate

Keep Marketing Automation `planned` in the parent register and this sub-plan
blocked. Resume only after a permitted Odoo 19 reference checkout or
authoritative equivalent supplies the complete `marketing_automation` addon:
manifest/version and demo declaration; Python models; XML menus, actions,
views, and search/grouping definitions; security/access and visibility groups;
frontend/assets; and relevant demo fixtures.

Then, in order:

1. inventory the exact visible Odoo menu tree, actions, ordering, permissions,
   route/action contexts, views, and reachable states;
2. capture authenticated Odoo desktop/mobile reference screens under
   `/tmp/core3-odoo-parity`;
3. reconcile that inventory with the existing Core3 service boundary;
4. define deterministic backend datasource fixtures and separate page/API YAML
   fragments joined through matching `page.id` values;
5. implement one bounded source-backed slice with permission, validation,
   empty/error, and focused integration coverage;
6. start the authenticated Core3 runtime and capture matching desktop/mobile
   evidence before making any visual-parity claim.

Until that dependency is present, the honest conclusion remains **source
unavailable; paired Odoo UI cloning is blocked**. The bounded Core3 slice
above is product-owned functionality and its labels/routes/fixtures must not
be presented as copied Odoo behavior.

## Validation evidence

- `git diff --check` — passed.
- `cd sdk/bun && bun run lint` — blocked before linting because `eslint` is not
  installed in this fresh worktree (`eslint: command not found`).
- `cd sdk/bun/sample && bun run audit` — blocked before discovery because the
  workspace dependency `@core3/server/discovery` is unavailable.
- Focused Marketing Automation implementation test — pending the current-wave
  API/page split and CRUD/enrollment slice.

## Revalidation — wave 2 (2026-09-12)

This worktree rechecked the source and runtime gates before changing any
product code. The requested relative `../odoo` checkout is absent; the
documented source checkout at `/home/nhanjs/projects/odoo` is the available
reference and remains on `19.0` revision `65975996`.

- `test -e /home/nhanjs/projects/odoo/addons/marketing_automation` — missing.
- `test -e /home/nhanjs/projects/odoo/enterprise/addons/marketing_automation`
  — missing; no local enterprise tree is present.
- `find /home/nhanjs/projects/odoo -maxdepth 4 -type d` finds only the
  unrelated `base_automation` and `marketing_card` marketing/automation
  candidates.
- `rg` across Odoo Python/XML/JS source finds no `marketing_automation`
  addon implementation; the only hits are unrelated comments in `mass_mailing`
  and `mass_mailing_sms`.
- `127.0.0.1:8069` and `:8073` answer `/web/login` with HTTP 200, but this
  cannot expose a missing addon. Core3 `/api/modules` is unavailable because
  neither `127.0.0.1:3000` nor `:32615` has a listener.

No source-supported menu/action/view/security/demo contract exists to map, so
no bounded UI/API slice, fixture, permission test, or screenshot is added in
this wave. The existing synthetic Core3 service remains unchanged and is not
treated as Odoo evidence. The blocker and the parent register status remain
unchanged.
