# Odoo 19 UI parity — Sale Subscriptions source gate

## Audit result (2026-09-12)

Sale Subscriptions is not source-available in the supplied local Odoo checkout.
The checkout used for this audit is `/home/nhanjs/projects/odoo` (the literal
`../odoo` path from this worktree,
`/home/nhanjs/projects/core3-worktrees/odoo`, does not exist). Its repository
is at commit `65975996`. The exact expected addon path and all of its parity
inputs are missing:

- `/home/nhanjs/projects/odoo/addons/sale_subscription/`
- `/home/nhanjs/projects/odoo/addons/sale_subscription/__manifest__.py`
- `/home/nhanjs/projects/odoo/addons/sale_subscription/models/`
- `/home/nhanjs/projects/odoo/addons/sale_subscription/views/`
- `/home/nhanjs/projects/odoo/addons/sale_subscription/security/`
- `/home/nhanjs/projects/odoo/addons/sale_subscription/data/`
- `/home/nhanjs/projects/odoo/addons/sale_subscription/demo/`
- `/home/nhanjs/projects/odoo/addons/sale_subscription/static/src/`

The repository contains no tracked `addons/sale_subscription` files. The only
subscription-named Odoo files found are the unrelated mailing-subscription
files under `addons/mass_mailing`; they are not a sale-subscription reference.
The neighboring available Sales addon is
`/home/nhanjs/projects/odoo/addons/sale_management`, whose manifest describes
Sales quotations and orders and does not provide the missing subscription
menu, model, view, security, demo, or asset source.

The parent register already records this module as `unavailable in supplied
source` and `planned` in
`sdk/bun/sample/plan/odoo-ui-parity-plan.md`. The previously referenced
`sdk/bun/sample/plan/odoo-ui-parity/subscriptions.md` did not exist before this
audit; this file is the source-availability gate, not an implementation plan
or a substitute Odoo screen inventory.

## Current Core3 ownership

Core3 does have an existing, YAML-first service at
`sdk/bun/sample/services/sale_subscription/`. Its manifest declares service id
`sale-subscription`, menu paths `/subscriptions`, `/invoices`, and `/plans`,
and permissions `subscriptions.read`, `subscriptions.write`, and
`subscriptions.manage`. Ownership is split across:

- `manifest.yaml`: service/menu contract;
- `storage.yaml` and the three migration files: `sale_subscriptions`,
  `sale_subscription_invoices`, and `sale_subscription_plans` storage plus
  demo data;
- `permissions.yaml`: permission declarations;
- `pages/subscriptions.yaml`: subscription list and declared view modes;
- `pages/subscription-detail.yaml`: detail form, invoice section, and actions;
- `pages/subscription-invoices.yaml`: recurring-invoice list/action;
- `pages/subscription-plans.yaml`: plan configuration surface;
- `pages/subscription-workflow.yaml`: subscription state transitions; and
- `styles/index.scss`: service styles.

These are current Core3 contracts, not evidence that the labels, routes,
states, fields, workflows, or layouts match Odoo. No Odoo menu tree, manifest
version/demo declaration, action context, visibility group, view XML, visible
text inventory, or responsive reference can be derived from the missing addon.
No unsupported Odoo screen is therefore approved or claimed here.

## Capture attempt and evidence boundary

The live Odoo listener responded on `http://127.0.0.1:8073/web` with a redirect,
but the missing addon means there is no authenticated Odoo subscription surface
to capture. Core3 had no listener on the checked `127.0.0.1:3000` endpoint, so
an authenticated Core3 capture could not start at either `1440x900` or
`390x844`. This session also did not expose `js_repl`, and the worktree has no
local Playwright package. No screenshot was produced and no visual-parity claim
is made. The reserved artifact location is
`/tmp/core3-odoo-parity/subscription-audit-20260912/`; images must remain
outside Git if a later runtime pass becomes possible.

## Dependency / next gate

Before any Sale Subscription parity implementation or screen capture:

1. Supply or install the matching Odoo `sale_subscription` addon in the local
   reference checkout, including its manifest, dependencies, models, views,
   security, data/demo, and backend/static assets.
2. Install that addon in the active reference database and verify its visible
   Sales menu tree, actions, groups, routes, and reachable screen states from
   the actual authenticated account.
3. Add the Odoo menu/view/source inventory and desktop/mobile reference captures
   to this sub-plan. Only then reconcile the existing Core3 YAML contracts and
   define an approved bounded implementation batch.
4. Start the Core3 runtime and repeat authenticated captures at exactly
   `1440x900` and `390x844`, with deterministic fixtures and permission-boundary
   checks recorded before parity sign-off.

Until gates 1–3 are satisfied, keep the parent register at `planned` and the
source status at `unavailable in supplied source`. Do not invent Odoo labels,
routes, fixtures, screenshots, or visual claims from the existing Core3
service.

## Read-only audit evidence

- `git -C /home/nhanjs/projects/odoo ls-files 'addons/sale_subscription/**'`
  returned no paths.
- `find /home/nhanjs/projects/odoo -maxdepth 5` found only unrelated
  `mass_mailing` subscription files, not `sale_subscription`.
- `rg --files sdk/bun/sample/services/sale_subscription` found the manifest,
  five page/workflow files, storage, permissions, three migrations, and styles
  listed above.
- `git diff --check` passes for this documentation change.
