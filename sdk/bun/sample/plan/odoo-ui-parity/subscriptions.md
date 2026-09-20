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
`sdk/bun/sample/plan/odoo-parity-plan.md`. The previously referenced
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

## Bounded Core3 contract slice (2026-09-12)

Because the Odoo addon remains absent, this batch does not assert parity. It
hardens the already-existing Core3 Subscription Plans surface so it is ready
for later source-backed reconciliation:

- `pages/subscription-plans.yaml` now contains layout only, with its API
  contract in `api/subscription-plans.yaml` joined by `page.id`.
- The create and archive actions remain manager-only through
  `subscriptions.manage`; duplicate and already-archived mutations have
  explicit status/code guards.
- `sale_subscription_plans` fixtures are checked for stable IDs, labels, and
  migration idempotency in `test/sale_subscription_plans.integration.test.ts`.

This is Core3 contract coverage, not an Odoo-derived menu, label, workflow, or
visual claim. The source gate below remains the prerequisite for selecting a
true parity batch.

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

## Live reference inventory and current-wave gap matrix (2026-09-20)

The requested live reference at `http://localhost:8069` was reachable and
authenticated as `codex@core3.local` against `core3_reference`. The reference
reports Odoo `19.0.1.0` for `sale_subscription`, but its state is
`uninstallable`; the container has neither the standard addon directory nor an
extra addon copy. The module's recorded summary is `MRR, Churn, Recurring
payments`, with no dependency records available from the installed module
metadata. This is stronger evidence than the source checkout alone that the
reference cannot expose a Sale Subscriptions screen in this environment.

The exact authenticated inventory is:

| Inventory kind | Query/result | Parity consequence |
| --- | --- | --- |
| Application/menu root | `Sales` exists as menu id `407`, sequence `30`; no `Subscriptions` menu is present | No live Sale Subscriptions menu path or ordering can be copied |
| Subscription menus | `ir.ui.menu.search_read([\"name\", \"ilike\", \"subscription\"])` returned no records | No submenu/action visibility group is observable |
| Subscription window actions | `ir.actions.act_window.search_read([\"name\", \"ilike\", \"subscription\"])` returned `[]` | No subscription model, domain, context, or view-mode action is installed |
| Subscription views | No model-backed `sale.subscription` view was returned; the only similarly named result was unrelated QWeb `Unsubscription` | No form/list/kanban/calendar/pivot/graph XML can be reconciled |
| Module state | `ir.module.module`: `sale_subscription`, `uninstallable`, installed version `19.0.1.0` | Full Odoo visual parity remains blocked by the reference fixture, not by Core3 YAML discovery |

The current Core3 service was then compared against the source gate. The
existing service has deterministic subscription, invoice, and plan tables plus
list/detail/workflow declarations. Commit `762d127d` normalized the remaining
subscription, detail, and invoice datasource/action contracts into separate
API fragments joined by `page.id`, and added direct state/version guards for
the lifecycle mutations.

| Gap ID | Odoo/reference evidence | Current Core3 source | Classification | Next change/evidence |
| --- | --- | --- | --- | --- |
| SS-REF-001 | `sale_subscription` is uninstallable and absent from the live menu tree | `subscriptions.md` source gate | blocked external dependency | Preserve the limitation; do not invent Odoo labels or screenshots |
| SS-CONTRACT-001 | No live action contract available | `pages/subscriptions.yaml` is layout-only; `api/subscriptions.yaml` joins by `page.id` | implemented in `762d127d` | Isolated schema validation passed |
| SS-CONTRACT-002 | No live view XML available | `pages/subscription-detail.yaml` is layout-only; `api/subscription-detail.yaml` owns backend behavior | implemented in `762d127d` | Isolated schema validation passed |
| SS-CONTRACT-003 | No live view XML available | `pages/subscription-invoices.yaml` is layout-only; `api/subscription-invoices.yaml` owns backend behavior | implemented in `762d127d` | Isolated schema validation passed |
| SS-DATA-001 | Odoo data cannot be seeded from the missing addon | migrations `001`–`003` provide deterministic Core3 rows | verified Core3 slice | Idempotent migration and row-count assertions passed |
| SS-LIFECYCLE-001 | Odoo lifecycle cannot be observed | workflow transitions now guard state and `row_version`; activation creates one invoice | verified Core3 slice | Create/edit/confirm/pause/close, forbidden churn, generate, and post assertions passed |
| SS-PERM-001 | Odoo groups are unavailable | `subscriptions.read/write/manage` are declared; focused authenticated actor test and live gateway checks enforce direct plan/lifecycle boundaries | verified Core3 slice | Keep paired Odoo group parity blocked until the addon is available |
| SS-VISUAL-001 | No paired Odoo desktop/mobile screen exists | Core3 authenticated route evidence passes at 1440x900 and 390x844; captures are outside Git | blocked external dependency | Keep paired visual parity pending; treat Core3 captures as implementation evidence only |

This inventory is the boundary for the current wave: the contract and
repository-backed lifecycle slice is implemented, but this is not a claim that
Core3 matches an unavailable Odoo screen. The next gate is authenticated Core3
desktop/mobile route evidence and a supplied/installable Odoo addon.
