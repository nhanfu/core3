# Fleet vehicle clickable statusbar evidence

Feature ID: `fleet-vehicle-statusbar-20260922`.

This bounded slice implements the Odoo `fleet.vehicle.state_id` clickable
statusbar on the existing vehicle detail page/API pair. It is not a claim of
full Fleet parity.

Artifacts:

- [`odoo-analysis.md`](odoo-analysis.md)
- [`functionality-checklist.md`](functionality-checklist.md)
- [`source-comparison.md`](source-comparison.md)
- [`gap-matrix.md`](gap-matrix.md)
- [`test-results.md`](test-results.md)
- [`verification.md`](verification.md)

Browser blocker captures from the same authenticated Odoo instance and
database are retained outside Git and referenced here:

- Desktop: `/tmp/core3-odoo-parity/fleet-manufacturer-models-action-20260922/browser-agent-window-blocker-desktop.png`
- Mobile: `/tmp/core3-odoo-parity/fleet-manufacturer-models-action-20260922/browser-agent-window-blocker-mobile.png`

They show the borrow-confirmation blocker state, not the Fleet action. No
Odoo/Core3 visual-parity claim is made.
