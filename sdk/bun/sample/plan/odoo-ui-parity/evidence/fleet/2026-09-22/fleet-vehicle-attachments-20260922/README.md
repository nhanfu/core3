# Fleet vehicle attachments

Feature ID: `fleet-vehicle-attachments-20260922`

This bounded slice adds the vehicle-form chatter attachment workflow from
Odoo Fleet: list durable attachments for a vehicle, upload/download files,
and remove an attachment with company, actor, permission, and row-version
guards. It is distinct from the Mail to Driver composer and contract renewal
activity slices.

Artifacts:

- `odoo-analysis.md` — local Odoo source trace and live-reference result.
- `functionality-checklist.md` — acceptance cases and results.
- `source-comparison.md` — Odoo/Core3 mapping.
- `gap-matrix.md` — supported and deliberately bounded behavior.
- `test-results.md` — focused and regression verification.
- `verification.md` — browser/runtime evidence and blockers.

Live Odoo blocker captures are outside Git:

- `/tmp/core3-odoo-parity/fleet-vehicle-avatar-20260922-odoo-desktop-blocker.png`
- `/tmp/core3-odoo-parity/fleet-vehicle-avatar-20260922-odoo-mobile-blocker.png`

They show the authenticated `core3_reference` shell without Fleet; they are
not Fleet parity captures.
