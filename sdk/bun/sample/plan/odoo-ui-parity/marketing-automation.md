# Odoo 19 UI parity — Marketing Automation source gate

Status: blocked — the exact Odoo 19 `marketing_automation` addon is unavailable;
no Odoo-parity UI implementation is authorized.

Audit date: 2026-09-12

## Parent-plan scope

The module register in `../odoo-ui-parity-plan.md` identifies Marketing
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
or verified from Odoo. No files in that service are changed by this audit.

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

Until that dependency is present, the honest conclusion is **source
unavailable; UI cloning blocked**. No Odoo labels, routes, fixtures, tests, or
visual evidence are added by this audit.

## Validation evidence

- `git diff --check` — passed.
- `cd sdk/bun && bun run lint` — blocked before linting because `eslint` is not
  installed in this fresh worktree (`eslint: command not found`).
- `cd sdk/bun/sample && bun run audit` — blocked before discovery because the
  workspace dependency `@core3/server/discovery` is unavailable.
- Focused Marketing Automation parity test — not added; there is no
  source-backed Odoo slice that could be tested truthfully.
