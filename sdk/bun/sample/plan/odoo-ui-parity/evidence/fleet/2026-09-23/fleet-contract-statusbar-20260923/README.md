# Fleet contract clickable statusbar — `FLEET-CONTRACT-STATUSBAR-001`

This bounded slice closes the missing Odoo contract-form interaction: the
clickable `fleet.vehicle.log.contract.state` statusbar now dispatches the
existing durable Core3 YAML mutations.

Artifacts:

- [`odoo-analysis.md`](odoo-analysis.md) — local Odoo source trace.
- [`source-comparison.md`](source-comparison.md) — Odoo/Core3 mapping.
- [`functionality-checklist.md`](functionality-checklist.md) — acceptance cases.
- [`test-results.md`](test-results.md) — focused and regression verification.
- [`verification.md`](verification.md) — persistence, static, and claim boundary.
- [`browser-check.md`](browser-check.md) — exact BrowserSkill blocker.

The captured PNGs are blocker evidence only and remain outside Git under
`/tmp/core3-odoo-parity/fleet-contract-statusbar-20260923/`. They show the
authenticated Odoo shell without a Fleet app, not a Fleet parity screen.
