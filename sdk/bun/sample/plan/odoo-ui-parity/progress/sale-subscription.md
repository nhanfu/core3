# sale-subscription parity progress

Module owner: sale-subscription module owner
QA assignment: module-owner verification in the current five-worker wave
Status: Core3 slice verified; Odoo parity blocked
Verification trigger: authenticated actor and responsive route QA; Odoo addon availability remains a separate gate
Candidate commit: current focused QA increment (hash recorded in git handoff)

## Current state

The live reference is reachable at `http://localhost:8069`, but
`sale_subscription` is `uninstallable`, absent from the container filesystem,
and has no authenticated Subscriptions menu, action, or model-backed view.
The source gate therefore remains active and no Odoo visual-parity claim is
made. Core3 does have a working YAML-first service with deterministic
subscription, invoice, and plan storage; the current implementation gap is
that three page files owned backend contracts instead of joining separate API
files by `page.id`. Commit `762d127d` fixes that contract boundary and adds
state plus optimistic-version guards to lifecycle actions.

Completed analysis for this wave:

- recorded the live module state and menu/action/view absence in
  `subscriptions.md`;
- classified the page/API contract split, lifecycle, deterministic-data,
  permission, and visual gaps; and
- selected contract normalization plus repository-backed lifecycle QA as the
  next bounded implementation slice.

Focused implementation evidence for `762d127d`:

- isolated page/API schema validation passed for all four pages and the
  workflow schema;
- idempotent migrations produced 2 subscriptions, 1 invoice, and 2 plans;
- create/edit validation rejected invalid dates, lifecycle transitions moved
  quotation → in progress → paused → closed, and closed → churn was rejected;
- activation generated one invoice, recurring invoice generation advanced the
  next date, posting persisted the invoice state, and all action permissions
  were declared.

## Authenticated actor and responsive evidence (2026-09-20)

The focused actor test now exercises the discovered Sale Subscription YAML API
with three authenticated permission sets. A read-capable actor can load the
Subscriptions page; a reader cannot activate a subscription; a writer cannot
create a plan; a manager can create a plan; and a writer can activate the
deterministic quotation, advancing its row version and creating one activation
invoice. The focused result was `1 pass`, `9 expect() calls`, `0 fail`.

The live Core3 gateway was also checked with authenticated local QA accounts:
the admin page request returned `200`, the dispatcher direct lifecycle request
returned `403` for `subscriptions.write`, the dispatcher direct plan request
returned `403` for `subscriptions.manage`, and the admin direct plan request
returned `200`. Credentials and bearer tokens were not recorded.

The installed Playwright fallback with Google Chrome covered the canonical
route at exactly `1440x900` and `390x844`. Both routes ended at
`/sale-subscription/subscriptions`, rendered the subscription tabs and seeded
rows/cards, had no console/page/request failures, and had no horizontal
overflow. Captures are outside Git at
`/tmp/core3-odoo-parity/sale-subscription-20260920/desktop.png` and
`mobile.png`.

## Next bounded task

Keep the reference-dependent menu/action/view and paired visual parity items
explicitly blocked until the `sale_subscription` addon is installed in the
live database with its source, security, views, data, and assets. Do not turn
the Core3 route evidence into an Odoo parity claim.
