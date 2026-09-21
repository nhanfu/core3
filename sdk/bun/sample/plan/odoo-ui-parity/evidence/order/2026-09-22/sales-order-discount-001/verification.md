# Verification and blockers

The Odoo reference was checked with authenticated bsk automation at desktop
1440x900 and mobile 390x844, and captures are listed in `odoo-analysis.md`.
The Core3 UI runtime was not available on ports 3001/3002, so no authenticated
Core3 screenshots or visual-parity assertion is made. The Odoo service on
8069 remained available. Functional persistence and guard behavior are proven
by the focused and scoped integration suites above.

Deferred broader Sales scope includes attachments/import/export/print,
payment/delivery callbacks, and other order workflow slices from the Sales
sub-plan.
