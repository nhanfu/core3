# Appraisals parity source gate

Status: blocked — the exact Odoo 19 `hr_appraisal` addon is unavailable; no UI
implementation is authorized.

Audit date: 2026-09-12

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

The module register in `../odoo-ui-parity-plan.md` identifies Appraisals as an
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
