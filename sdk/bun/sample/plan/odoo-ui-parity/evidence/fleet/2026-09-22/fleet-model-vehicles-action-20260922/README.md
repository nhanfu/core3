# Fleet model Vehicles stat action evidence

Feature ID: `FLEET-MODEL-VEHICLES-001`

This bounded slice closes the Odoo `fleet.vehicle.model.action_model_vehicle`
stat action. The model detail action now passes `model_id` to `/vehicles`, and
the Vehicles datasource scopes rows through durable `fleet_vehicle_model_rel`
storage. It is not a full Fleet sign-off.

Evidence files:

- `odoo-analysis.md` — local Odoo source trace.
- `source-comparison.md` — Odoo/Core3 contract mapping.
- `functionality-checklist.md` — bounded acceptance checklist.
- `gap-matrix.md` — supported and deferred boundaries.
- `test-results.md` — focused and regression commands.
- `verification.md` — implementation verification and claim boundary.
- `browser-check.md` — exact BrowserSkill ownership blocker.
- `browser-agent-window-blocker.png` — 1916x833 blocked Agent Window capture.
- `browser-agent-window-blocker-mobile.png` — 390x844 emulation capture of the blocked Agent Window.

No authenticated Odoo or Core3 visual-parity claim is made from this evidence
directory.
