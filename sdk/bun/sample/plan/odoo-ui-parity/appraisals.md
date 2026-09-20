# Appraisals parity source gate

Status: implementation in progress — the live Odoo reference is reachable, but
`hr_appraisal` is installed as `uninstallable` and exposes no visible menu.
The implementation below is a bounded Core3 appraisal workflow slice; no full
Odoo visual-parity claim is made until an installable reference is available.

Audit date: 2026-09-12

## Current-wave live inventory (2026-09-20)

The required live reference check used `http://localhost:8069`, database
`core3_reference`, and the local QA account. Credentials are not recorded
here. Authentication succeeded at `/odoo`.

The authoritative model queries returned:

| Inventory item | Result |
| --- | --- |
| `ir.module.module`, `name = hr_appraisal` | id `699`, `shortdesc = Appraisal`, `state = uninstallable`, no `latest_version` |
| `ir.ui.menu`, name contains `Appraisal` | zero records |
| Odoo Appraisal application/menu/action route | not reachable because the addon is not installable |
| Odoo Appraisal views, demo records, and action contexts | not available from the running database |

This is a stronger runtime gate than the previous source-only audit: the
reference server is available, but it does not expose an Appraisals surface to
inventory. The empty menu result is retained as evidence; it is not evidence
that Odoo has no Appraisals feature in an installable Enterprise deployment.

## Current-wave gap matrix

| Stable ID | Odoo reference item | Current Core3 implementation | Gap / required change | QA evidence |
| --- | --- | --- | --- | --- |
| APP-MENU-001 | Appraisal application/menu/action | `manifest.yaml` exposes Appraisals, Appraisal Cycles, and Analysis | Live reference has no visible menu; preserve Core3 route aliases and mark exact menu parity open | authenticated menu inventory plus Core3 menu capture |
| APP-LIST-001 | Appraisal list action and records | `pages/reviews.yaml` has a real `appraisals` SQL datasource and Odoo-style ListView | Add detail navigation and complete CRUD contract; validate against any installable reference later | list query, create, edit, archive/delete, reload |
| APP-FORM-001 | Appraisal form/detail | `pages/review-detail.yaml` reads a persisted record and declares statusbar | Add permissioned edit mutation and visible action bindings for form state | detail render, edit persistence, stale write |
| APP-WORK-001 | Appraisal state changes | `pages/appraisal-workflow.yaml` declares Draft → In Progress → Manager Review → Completed/Cancelled | Exercise guards and actor boundaries through real mutation requests | transition matrix and negative guards |
| APP-CYCLE-001 | Appraisal cycle administration | `pages/cycles.yaml` reads and creates persisted cycles | Add update/delete lifecycle and deterministic validation | cycle CRUD and restart persistence |
| APP-REPORT-001 | Appraisal analysis/reporting | `pages/analysis.yaml` reads persisted totals and state counts | Add explicit report datasource metadata and verify empty/data states | analysis counts before/after mutation |
| APP-PERM-001 | Odoo visibility groups | `permissions.yaml` declares read/write/manage capabilities | Live groups cannot be observed while addon is uninstallable; prove Core3 read/write/manage boundaries | authenticated admin/ordinary/anonymous checks |
| APP-DATA-001 | Odoo demo data | migration seeds one cycle and appraisal | Expand deterministic data to cover each workflow state and analysis | clean migration, rerun, restart, state counts |

The bounded implementation target for this wave is APP-LIST-001 through
APP-DATA-001. APP-MENU-001 remains explicitly reference-blocked, and no
Odoo-specific labels, action ids, or screenshots are invented for it.

## Wave 2 verification evidence

The source gate was rechecked before selecting the implementation scope:

```text
$ test -d /home/nhanjs/projects/core3-worktrees/odoo
missing
$ git -C /home/nhanjs/projects/odoo branch --show-current
19.0
$ git -C /home/nhanjs/projects/odoo rev-parse HEAD
659759969d535d286b656c96b675e4612b925ddd
$ test -d /home/nhanjs/projects/odoo/addons/hr_appraisal
missing
$ git -C /home/nhanjs/projects/odoo ls-files 'addons/hr_appraisal/**' 'enterprise/addons/hr_appraisal/**'
(no output)
```

The available source therefore cannot support a source-backed UI/UX slice in
this wave. The bounded result is the exact unavailable-addon blocker recorded
below; no Core3 YAML, fixture, permission, route, or visual contract was
changed.

## Parent-plan scope

The module register in `../odoo-parity-plan.md` identifies Appraisals as an
Odoo 19 `hr_appraisal` module and marks it `planned` with its source
unavailable. This audit confirms that source gate. The required Odoo menu,
action, view, permission, demo-data, and authenticated desktop/mobile
comparison inventory cannot be completed from the available local checkouts.

## Exact Odoo source audit

The relative reference path `../odoo` from this worktree resolves to
`/home/nhanjs/projects/core3-worktrees/odoo` and is missing. The supplied local
Odoo checkout is `/home/nhanjs/projects/odoo`, on branch `19.0`, revision
`659759969d535d286b656c96b675e4612b925ddd`.

The exact addon paths checked are absent:

| Checked path | Result |
| --- | --- |
| `/home/nhanjs/projects/core3-worktrees/odoo` | missing checkout |
| `/home/nhanjs/projects/core3-worktrees/odoo/addons/hr_appraisal` | unavailable because parent checkout is missing |
| `/home/nhanjs/projects/core3-worktrees/odoo/addons/hr_appraisal/__manifest__.py` | unavailable because parent checkout is missing |
| `/home/nhanjs/projects/odoo/addons/hr_appraisal` | missing |
| `/home/nhanjs/projects/odoo/addons/hr_appraisal/__manifest__.py` | missing |
| `/home/nhanjs/projects/odoo/addons/hr_appraisal/views` | missing |
| `/home/nhanjs/projects/odoo/addons/hr_appraisal/models` | missing |
| `/home/nhanjs/projects/odoo/addons/hr_appraisal/security` | missing |
| `/home/nhanjs/projects/odoo/addons/hr_appraisal/demo` | missing |
| `/home/nhanjs/projects/odoo/addons/hr_appraisal/static` | missing |
| `/home/nhanjs/projects/odoo/enterprise/addons/hr_appraisal` | missing; no local enterprise tree was found |

The Odoo checkout has no tracked `hr_appraisal` addon path or manifest. A
repository-wide search of the relevant local project checkouts found no other
`hr_appraisal` directory. Generic `hr_appraisal` strings in Odoo translation
files under `odoo/addons/base/i18n/` are module descriptions only; they do not
provide the addon manifest, menus, actions, views, security, assets, or demo
records.

Consequently, no exact Odoo 19 addon version metadata, official demo-data
declaration, application menu tree, action identifiers, visibility groups,
routes, views, responsive states, or reference screenshots can be asserted.
No Odoo desktop or mobile capture was attempted because there is no local
Appraisals reference surface to navigate or compare.

## Current Core3 ownership

Core3 does have a pre-existing YAML domain service at
`sdk/bun/sample/services/appraisals/`, registered in
`sdk/bun/sample/config.yaml` as `appraisals` at `/appraisals`. Its current
ownership is:

- `manifest.yaml`: Appraisals, Appraisal Cycles, and Appraisal Analysis menu
  entries;
- `permissions.yaml`: `appraisals.read`, `appraisals.write`, and
  `appraisals.manage`;
- `pages/reviews.yaml`, `pages/review-detail.yaml`, `pages/cycles.yaml`, and
  `pages/analysis.yaml`: Core3 page and datasource contracts;
- `pages/appraisal-workflow.yaml`: Draft, In Progress, Manager Review,
  Completed, and Cancelled workflow declarations;
- `migrations/20260818230000-001-appraisals-foundation.yaml`: appraisal cycle
  and appraisal tables;
- `migrations/20260818231000-002-appraisals-demo-data.yaml`: one synthetic
  cycle and appraisal fixture;
- `storage.yaml` and `styles/index.scss`: DuckDB storage and minimal service
  styling.

This is a Core3 product service boundary, not evidence of Odoo parity. Its
labels, `/appraisals` route, fields, workflow states, fixture data, and layout
contracts must not be presented as Odoo-derived behavior.

## Why UI cloning cannot truthfully proceed

The parity contract requires the complete Odoo menu/action/view inventory before
implementation and authenticated comparison captures for each implemented
screen. With `hr_appraisal` absent, there is no authoritative basis for
choosing Odoo labels, route/action context, menu ordering, field groups,
visibility rules, view modes, responsive geometry, visual tokens, or official
demo records. Reusing the existing Core3 YAML would turn a synthetic product
foundation into an invented Odoo reference. Therefore no bounded UI slice,
page/API YAML join, deterministic Odoo fixture set, permission claim, test, or
visual evidence is added by this audit.

## Dependency / next gate

Keep Appraisals `planned` in the parent register and this sub-plan blocked.
Resume only after a permitted Odoo 19 reference checkout or authoritative
equivalent supplies the exact `hr_appraisal` manifest and complete relevant
Python/XML/JS/SCSS source, menu/action/view definitions, security and
visibility declarations, and demo-data declaration.

Then, in order:

1. inventory the exact visible Odoo menu tree, actions, views, permissions, and
   reachable desktop/mobile states;
2. capture the Odoo reference at `1440x900` and `390x844` under
   `/tmp/core3-odoo-parity`;
3. reconcile that inventory with the existing Core3 service boundary;
4. define deterministic datasource fixtures and page/API YAML joined through
   matching `page.id` values;
5. implement one approved bounded slice with permission-boundary tests and
   authenticated desktop/mobile browser evidence.

Until that dependency is present, the honest conclusion is **source
unavailable; UI cloning blocked**. No Odoo labels, routes, fixtures, tests, or
visual claims are asserted by this sub-plan.
